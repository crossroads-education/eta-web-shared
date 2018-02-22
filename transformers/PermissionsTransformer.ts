import * as eta from "../eta";
import * as db from "../db";
import * as orm from "typeorm";

export default class PermissionsTransformer extends eta.IRequestTransformer {
    public async isRequestAuthorized(permissions: any[]): Promise<boolean> {
        if (!this.isLoggedIn()) return false;
        const user: db.User = this.req.session.user;
        return this.res.locals.isAuthoritativelyAuthorized || user.hasPermissions(permissions);
    }

    public async onRequest(): Promise<void> {
        if (!this.isLoggedIn()) {
            if (!this.req.headers.authorization) return;
            const user = await this.db.user.findOne({
                apiToken: this.req.headers.authorization.toString().split(" ")[1]
            });
            if (!user) return;
            this.req.session.userid = user.id;
        }
        if (this.req.session.user !== undefined) {
            // session objects don't persist their methods
            this.req.session.user = this.db.user.create(this.req.session.user);
            // no need to save, we just need the constructed version in-memory
            return;
        }
        this.req.session.user = await db.User.joinPermissions(this.db.user.createQueryBuilder("user"))
            .whereInIds([this.req.session.userid])
            .getOne();
        await this.saveSession();
    }
}
