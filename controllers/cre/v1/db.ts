import * as eta from "../../../eta";
import * as db from "../../../db";
import Seeder from "../../../lib/Seeder";

@eta.mvc.route("/cre/v1/db")
@eta.mvc.controller()
export default class CreDbController extends eta.IHttpController {
    @eta.mvc.raw()
    @eta.mvc.get()
    public async seed(): Promise<void> {
        // count all rows
        const allRowsCount = ((await this.db.connection.query("SELECT sum(n_live_tup) as count FROM pg_stat_user_tables"))[0] || {}).count;
        if (allRowsCount !== undefined && allRowsCount > 0) {
            eta.logger.warn("Seed attempted with pre-existing data!");
            this.res.statusCode = eta.constants.http.AccessDenied;
            return;
        }
        const actions = this.server.app.getActionsWithFlag("seed", this)
            .sort((a, b) => <number>a.flagValue - <number>b.flagValue)
            .map(a => a.action);
        await new Seeder(this.db, actions).start();
        this.result(db.GenericApiResult.Success);
    }
}
