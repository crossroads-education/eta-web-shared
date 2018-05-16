import * as eta from "@eta/eta";
import GraphQLLifecycle from "@eta/modules/cre-web-shared/lifecycle/GraphQLLifecycle";

@eta.controller("/cre/graphql")
export default class CreGraphQLController extends eta.HttpController {
    @eta.action({
        method: "GET",
        url: "index",
        isAuthRequired: true
    })
    async get() {
        await GraphQLLifecycle.middleware(this.req, this.res);
        this.res.locals.finished = true;
    }

    @eta.action({
        method: "POST",
        url: "index",
        isAuthRequired: true
    })
    post() { return this.get(); }
}
