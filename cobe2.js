/**
 * cobe2.js (The COde BEautifier)
 * 
 * Copyright 2018 - today 
 * Author: s0nda
 * 
 * Sources:
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Guide/Regular_Expressions
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/RegExp
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String/replace
 */
var _this = (typeof window !== 'undefined') ? window : {};
/*
 * COBE (COde BEautifier) object
 */
var COBE = (function (_this) {
    //
    // Define new String function to escape special signs
    //
    if ( typeof String.prototype.escapeHTML === 'undefined' ) {
        String.prototype.escapeHTML = function () {
            return (
                this.replace(/<\/.*>(?![^ ])/g, "") // Negated Lookahead x(?:y): 
                                                    //    Match any pattern </.*> (e.g. </stdio.h>, </string>) only if it is NOT followed 
                                                    //    by [^ ] (i.e. any special character like \r,\n,\t etc. that is NOT empty).
                                                    //    In anderen Worten, match jedes Muster, das vor \r,\n,\t etc. steht.
                    .replace(/>/g, "&gt;")  // '>' is replaced by &gt;
                    .replace(/</g, "&lt;")  // '<' is replaced by &lt;
            );
        };
    }
    //
    // Define new String function to replace a substring at certain position
    //
    if ( typeof String.prototype.replaceAt === 'undefined' ) {
        String.prototype.replaceAt = function (substr, newsubstr, index) {
            return this.substring(0, index) + newsubstr + this.substring(index + substr.length);
        };
    }
    //
    // CSS seletor(s)
    //
    const DEFAULT_CSS_SELECTOR_CODE_BLOCKS = "div.cobe";
    //
    // Array of code blocks. Every single block (div.cobe) is an element in array.
    //
    let blocks = [];
    //
    // Collection (closure) of all PUBLIC (_) variables and properties
    //
    let _ = {
        THEMES : {}, // object
        active_theme : null, // object (null)
        /*
         * init
         *
         * Description: Initialize values
         */
        init : function () {
            blocks = document.querySelectorAll(DEFAULT_CSS_SELECTOR_CODE_BLOCKS) || [];
            if ( blocks.length == 0 ) {
                return;
            }
            //
            // Set active theme
            //
            if ( !_.active_theme ) {
                _.active_theme = _.themes["DARK"]; // "_" refers to "this" == "this.active_theme" == "_this.COBE.active_theme"
            }
            
            //
            // Start making code pretty
            //
            this.beautify();
        }, // END (init)
        /*
         *
         */
        beautify : function () {

        }, // END (beautify)
    };
    //
    _this.COBE = _; // == window.COBE
    //
    document.addEventListener("DOMContentLoaded", () => _.init(), false);
    //
    return _;
})(_this);
//
//
//
COBE.THEMES.DARK = {
    BACKGROUND : "background: #2E3436;",
    FONT_COLOR : "color: #fff;",
    NUMBER_BACKGROUND: "background: #494949;",
    NUMBER_COLOR: "color: #c0b9b7;",
    COMMENT : "color: #33ff46;",
    TYPE : "color: #4198ef;",
    KEYWORD : "color: #f99df2;",
    DIRECTIVE : "color: #fcb246;",
    FUNCTION : "color: #fcfc81;"
};