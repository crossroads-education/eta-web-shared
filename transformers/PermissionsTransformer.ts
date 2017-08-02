import * as eta from "../eta";
import * as db from "../db";

export default class PermissionsTransformer extends eta.IRequestTransformer {
    public async isRequestAuthorized(permissions: any[]): Promise<boolean> {
        if (!this.isLoggedIn()) return false;
        const person: db.Person = this.req.session.person;
        return permissions.every(p => person.hasPermission(p));
    }

    public async onRequest(): Promise<void> {
        if (!this.isLoggedIn()) return;
        if (this.req.session.person !== undefined) {
            // session objects don't persist their methods
            this.req.session.person = new db.Person(this.req.session.person);
            // no need to save, we just need the constructed version in-memory
            return;
        }
        this.req.session.person = await db.person().findOneById(this.req.session.userid);
        await this.saveSession();
    }
}
