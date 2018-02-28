import * as eta from "../../../eta";
import * as db from "../../../db";
import Seeder from "../../../lib/Seeder";

@eta.mvc.controller()
export default class CreDbController extends eta.IHttpController {
    public async seed(): Promise<void> {
        // count all rows
        const allRowsCount = ((await this.db.connection.query("SELECT sum(n_live_tup) as count FROM pg_stat_user_tables"))[0] || {}).count;
        if (allRowsCount !== undefined && allRowsCount > 0) {
            eta.logger.warn("Seed attempted with pre-existing data!");
            return;
        }
        const actions = this.server.app.getActionsWithFlag("seed", this)
            .sort((a, b) => <number>a.flagValue - <number>b.flagValue)
            .map(a => a.action);
        const seeder = new Seeder(this.db, actions);
        seeder.on("progress", (evt: {
            typeName: string;
            count: number;
        }) => {
            eta.logger.trace(`Seeded ${evt.typeName} with ${evt.count} rows.`);
        });
        await seeder.start();
        const insertedRowsCount = Object.keys(seeder.rows)
            .map(k => (<any>seeder.rows)[k].length)
            .reduce((p, v) => p + v, 0);
        eta.logger.info(`Finished seeding database. Inserted ${insertedRowsCount} rows.`);
    }
}
