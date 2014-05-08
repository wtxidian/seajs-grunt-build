define("app1/app1/index/src/index-debug", [ "gallery/jquery/1.8.2/jquery-debug", "dist/styles/component/dialog/src/dialog-debug", "dist/styles/component/dialog/src/dialog_css.css-debug" ], function(require, exports) {
    var $ = require("gallery/jquery/1.8.2/jquery-debug"), Dialog = require("dist/styles/component/dialog/src/dialog-debug");
    $("#btnDialog").bind("click", function() {
        var mapDialog = new Dialog({
            type: "text",
            value: "hello world!",
            width: "230px",
            height: "60px"
        });
        mapDialog.show();
    });
});

seajs.use("app1/app1/index/src/index");