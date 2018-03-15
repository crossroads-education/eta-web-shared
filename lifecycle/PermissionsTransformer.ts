import * as eta from "@eta/eta";
import * as db from "@eta/db";

export default class PermissionsTransformer extends eta.LifecycleHandler {
    public get sortOrder(): number { return 0; }

    public register(): void {
        this.app.on("request:auth", this.isRequestAuthorized.bind(this));
        this.app.on("request", this.onRequest.bind(this));
    }

    private async isRequestAuthorized(http: eta.IRequestHandler, permissions: any[]): Promise<boolean> {
        if (!http.isLoggedIn()) return false;
        const user: db.User = http.req.session.user;
        return http.res.locals.isAuthoritativelyAuthorized || user.hasPermissions(permissions);
    }

    private async onRequest(http: eta.IRequestHandler): Promise<void> {
        if (!http.isLoggedIn()) {
            if (!http.req.headers.authorization) return;
            const user = await http.db.user.findOne({
                apiToken: http.req.headers.authorization.toString().split(" ")[1]
            });
            if (!user) return;
            http.req.session.userid = user.id;
        }
        if (http.req.session.user !== undefined) {
            // session objects don't persist their methods
            http.req.session.user = http.db.user.create(http.req.session.user);
            // no need to save, we just need the constructed version in-memory
            return;
        }
        http.req.session.user = await db.User.joinPermissions(http.db.user.createQueryBuilder("user"))
            .whereInIds([http.req.session.userid])
            .getOne();
        await http.saveSession();
    }
}
