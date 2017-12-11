/**
 * This helper allows Ajax submission of forms (instead of redirections for user)
 * with no additional javascript required.
 * Format:
 * div.ajax-form(data-action="/post/wherever", data-method="POST", data-success="#success-selector", data-error="#error-selector")
 *     input.form-control(name="whatever", type="text")
 *     button.btn.btn-success.btn-submit
 */

import HelperStatus from "helpers/HelperStatus.js";

function setupForm($form: JQuery): void {
    const status: HelperStatus = new HelperStatus($form.data("success"), $form.data("error"));
    const action: string = $form.attr("data-action");
    const method: string = $form.attr("data-method");
    $form.on("ajax-form-submit", (evt, params) => {
        submitForm(params);
    });
    function submitForm(params: {[key: string]: any}): void {
        $.ajax({
            method,
            url: action,
            data: params
        }).done(response => {
            if (response.error !== undefined) {
                let message = "The server returned an error code: " + response.error;
                if (response.message) message += ", " + response.message;
                status.error(message);
            } else {
                status.success("Successfully submitted the form.");
            }
        }).fail(err => {
            if (err.status === 200) status.success("Successfuly submitted the form. (Bad response code 200)");
            else status.error("An error occurred while submitting the form: " + err.statusText);
        });
    }
    if ($form[0].hasAttribute("data-notrigger")) {
        return;
    }
    $form.find(".form-control").on("keypress", (evt: JQuery.Event) => {
        if (evt.which === JQuery.Key.Enter) {
            $form.find(".btn-submit").click();
        }
    });
    $form.find(".btn-submit").on("click", () => {
        const params: {[key: string]: any} = {};
        let canSubmit = true;
        $form.find(".form-control").each((i, e) => {
            const name: string = e.getAttribute("name");
            let value: any = $(e).val();
            if (e.getAttribute("type") === "checkbox") {
                value = (<HTMLInputElement>e).checked;
            }
            if (e.hasAttribute("required") && !value) {
                canSubmit = false;
            }
            params[name] = value;
        });
        if (!canSubmit) {
            status.error("Required fields were left blank.");
            return;
        }
        submitForm(params);
    });
}

$(document).ready(function() {
    $(".ajax-form").each((i, e) => setupForm($(e)));
});
