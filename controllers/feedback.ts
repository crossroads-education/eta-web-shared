import * as db from "../db";
import * as eta from "../eta";

@eta.mvc.route("/api/feedback")
@eta.mvc.controller()
export default class ApiFeedbackController extends eta.IHttpController {
    @eta.mvc.raw()
    @eta.mvc.post()
    @eta.mvc.authorize()
    public async post({ text }: { text: string }): Promise<void> {
        await this.db.feedback.save(this.db.feedback.create({
            author: <any>{ id: this.req.session.userid },
            text
        }));
        return this.result(0);
    }
}
