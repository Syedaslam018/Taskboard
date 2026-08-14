import { Types } from "mongoose";
import { Workspace } from "../models/Workspace";
import { Board } from "../models/Board";
import { Task, ITask } from "../models/Task";
import { Activity } from "../models/Activity";

const DUE_SOON_WINDOW_DAYS = 3;

type CountFacet = [{ count: number }?];

export const dashboardService = {
  /**
   * One aggregation pipeline computes total/completed/inProgress/overdue/
   * dueSoon counts plus a preview list, in a single round trip to Mongo -
   * five separate `.countDocuments()` calls would mean five round trips for
   * data the database can already slice in one pass with $facet.
   */
  async getForUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // Every board across every workspace the user belongs to - needed to
    // know both which tasks are "theirs" and which of those tasks' columns
    // count as "done" (see Board.isDone).
    const workspaceIds = (
      await Workspace.find({ "members.user": userObjectId }).select("_id").lean()
    ).map((w) => w._id);

    const boards = await Board.find({ workspaceId: { $in: workspaceIds } })
      .select("columns")
      .lean();
    const doneColumnIds = boards.flatMap((b) =>
      b.columns.filter((c) => c.isDone).map((c) => c._id)
    );
    const boardIds = boards.map((b) => b._id);

    const now = new Date();
    const dueSoonThreshold = new Date(now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [facetResult] = await Task.aggregate<{
      total: CountFacet;
      completed: CountFacet;
      inProgress: CountFacet;
      overdue: CountFacet;
      dueSoon: CountFacet;
      myTasks: ITask[];
    }>([
      { $match: { boardId: { $in: boardIds }, assignee: userObjectId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          completed: [{ $match: { columnId: { $in: doneColumnIds } } }, { $count: "count" }],
          inProgress: [{ $match: { columnId: { $nin: doneColumnIds } } }, { $count: "count" }],
          overdue: [
            { $match: { columnId: { $nin: doneColumnIds }, dueDate: { $lt: now } } },
            { $count: "count" },
          ],
          dueSoon: [
            {
              $match: {
                columnId: { $nin: doneColumnIds },
                dueDate: { $gte: now, $lte: dueSoonThreshold },
              },
            },
            { $count: "count" },
          ],
          myTasks: [{ $sort: { dueDate: 1, createdAt: -1 } }, { $limit: 10 }],
        },
      },
    ]);

    const extractCount = (facet: CountFacet | undefined) => facet?.[0]?.count ?? 0;

    const recentActivity = await Activity.find({ workspaceId: { $in: workspaceIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      stats: {
        total: extractCount(facetResult?.total),
        completed: extractCount(facetResult?.completed),
        inProgress: extractCount(facetResult?.inProgress),
        overdue: extractCount(facetResult?.overdue),
        dueSoon: extractCount(facetResult?.dueSoon),
      },
      myTasks: facetResult?.myTasks ?? [],
      recentActivity,
    };
  },
};
