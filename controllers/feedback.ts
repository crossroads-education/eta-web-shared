import * as eta from "@eta/eta";

@eta.controller("/api/feedback")
export default class ApiFeedbackController extends eta.HttpController {
    @eta.action({
        method: "POST",
        isAuthRequired: true
    })
    async post({ text }: { text: string }) {
        await this.db.feedback.save(this.db.feedback.create({
            author: <any>{ id: this.req.session.userid },
            text
        }));
        return "{}";
    }
}
