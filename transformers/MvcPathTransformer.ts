import * as express from "express";
import * as eta from "../eta";

export default class MvcPathTransformer extends eta.IRequestTransformer {
    public async beforeResponse(): Promise<void> {
        this.res.view["mvcPath"] = this.req.mvcPath;
    }
}
