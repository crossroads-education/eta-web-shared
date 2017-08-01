function setupCollapsibleModal() {
    $(".collapsible-parent").each(function(this: HTMLElement) {
        const $this: JQuery = $(this);
        const $body: JQuery = $this.find(".collapsible-body");
        $body.collapse();
        // on modal hide
        $body.on("hide.bs.collapse", () => {
            $this.find(".glyphicon")
                .removeClass("glyphicon-minus collapsible-rotate-minus")
                .addClass("glyphicon-plus collapsible-rotate-plus");
        });
        // on modal show
        $body.on("show.bs.collapse", () => {
            $this.find(".glyphicon")
                .removeClass("glyphicon-plus collapsible-rotate-plus")
                .addClass("glyphicon-minus collapsible-rotate-minus");
        });
        // on header click
        $this.find(".collapsible-header").on("click", () => {
            $body.collapse("toggle");
        });
        $body.collapse("hide");
    });
}

$(document).ready(function() {
    setupCollapsibleModal();
});
