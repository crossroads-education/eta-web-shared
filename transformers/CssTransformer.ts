import * as express from "express";
import * as fs from "fs";
import * as eta from "../eta";

export default class CssTransformer extends eta.IRequestTransformer {

    public async beforeResponse(): Promise<void> {
        this.res.view.defaultCssExists = this.server.app.staticFiles[`/css${this.req.mvcPath}.css`] !== undefined;
    }
}
