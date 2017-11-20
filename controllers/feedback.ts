import * as db from "../db";
import * as eta from "../eta";

@eta.mvc.route("/api/feedback")
@eta.mvc.controller()
export default class ApiFeedbackController extends eta.IHttpController {
    @eta.mvc.raw()
    @eta.mvc.post()
    @eta.mvc.authorize()
    public async post({ text }: { text: string }): Promise<void> {
        const feedback: db.Feedback = new db.Feedback({
            author: <any>{ id: this.req.session.userid },
            text
        });
        await db.feedback().save(feedback);
        this.res.raw = "{}";
        // return this.result(db.ApiResult.Success);
    }
}
