import * as eta from "../../../eta";
import * as db from "../../../db";
import Seeder from "../../../lib/Seeder";

@eta.mvc.route("/cre/v1/db")
@eta.mvc.controller()
export default class CreDbController extends eta.IHttpController {
    @eta.mvc.raw()
    @eta.mvc.get()
    public async seed(): Promise<void> {
        const actions = this.server.app.getActionsWithFlag("seed", this)
            .sort((a, b) => <number>a.flagValue - <number>b.flagValue)
            .map(a => a.action);
        await new Seeder(this.db, actions).start();
        this.result(db.GenericApiResult.Success);
    }
}
