import * as eta from "@eta/eta";
import * as db from "@eta/db";
import SeedController from "../controllers/cre/v1/db";

export default class CLIProcessLifecycle extends eta.LifecycleHandler {
    public register(): void {
        this.app.on("app:start", async () => {
            process.on("message", this.onProcessMessage.bind(this));
        });
        this.app.on("server:start", async () => {
            if (process.send) process.send("eta:started");
        });
    }

    private onProcessMessage(msg: string): void {
        if (typeof(msg) !== "string" || !msg.startsWith("eta:cre:")) return;
        const controllerPartial: Partial<eta.HttpController> = {
            db: new db.RepositoryManager("localhost"),
            app: this.app
        };
        let promise: Promise<void>;
        if (msg.endsWith(":seed")) {
            promise = new SeedController(controllerPartial).seed();
        }
        promise.then(() => {
            process.send(msg);
        }).catch(err => eta.logger.error(err));
    }
}
