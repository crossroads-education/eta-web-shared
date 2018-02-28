import * as eta from "../eta";
import * as db from "../db";
import Application from "../../../server/Application";
import SeedController from "../controllers/cre/v1/db";
import TestsController from "../controllers/cre/v1/tests";

export default class CLIProcessLifecycle extends eta.ILifecycleHandler {
    public register(app: Application): void {
        app.on("init", () => {
            process.on("message", msg => {
                if (typeof(msg) !== "string" || !msg.startsWith("eta:cre:")) return;
                const controllerPartial = {
                    db: new db.RepositoryManager("localhost"),
                    server: app.server
                };
                let promise: Promise<void>;
                if (msg.endsWith(":seed")) {
                    promise = new SeedController(controllerPartial).seed();
                } else if (msg.endsWith(":test")) {
                    promise = new TestsController(controllerPartial).run();
                }
                promise.then(() => {
                    process.send(msg);
                }).catch(err => eta.logger.error(err));
            });
        });
    }
}
