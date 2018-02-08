import * as eta from "../eta";
import * as db from "../db";
import * as orm from "typeorm";

export default class PermissionsTransformer extends eta.IRequestTransformer {
    public async isRequestAuthorized(permissions: any[]): Promise<boolean> {
        if (!this.isLoggedIn()) return false;
        const user: db.User = this.req.session.user;
        return this.res.locals.isAuthoritativelyAuthorized || await user.hasPermissions(permissions, orm.getConnection(this.req.hostname));
    }

    public async onRequest(): Promise<void> {
        if (!this.isLoggedIn()) return;
        if (this.req.session.user !== undefined) {
            // session objects don't persist their methods
            this.req.session.user = this.db.user.create(this.req.session.user);
            // no need to save, we just need the constructed version in-memory
            return;
        }
        this.req.session.user = await this.db.user.findOneById(this.req.session.userid);
        await this.saveSession();
    }
}
