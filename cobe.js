/**
 * cobe.js (The COde BEautifier
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

/*
 * COBE (COde BEautifier)
 */
var COBE = (function () {
    //
    // Collections of keywords in code
    //
    const DEFAULT_TYPES = "unsigned|byte|char|int|float|double|void";
    const DEFAULT_KEYWORDS = "if|then|else|fi|for|do|while|done|break|continue|return|switch|case|default|in";
    const DEFAULT_DIRECTIVES = "#pseudoA|#include|#ifdef|#ifndef|#define|#endif|#!/bin/bash|#pseudoB"; // Workaround: Must add "pseudoA" at beginning and "#pseudoB" at the end. Otherwise, the first (#include) and last (#endif) directive will not be recognized.
    //
    // RegExp for keywords (types, control-keywords, directives) in code
    //
    const DEFAULT_REGEX_TYPES = "((const|static|)[ ]+)?(" + DEFAULT_TYPES + ")[ ]+(\\*)?"; // double-backslash (\\) to escape the start (*)
    const DEFAULT_REGEX_KEYWORDS = "\\b(" + DEFAULT_KEYWORDS + ")\\b(?=[ ]*.*(;|:|((\r?\n|\r)?{|})))"
                                +  "|^(" + DEFAULT_KEYWORDS + ")$"
                                + "|;[ ]+(" + DEFAULT_KEYWORDS + ")"; // Bash syntax: <while> ... ; <do>
    const DEFAULT_REGEX_DIRECTIVES = "\\b" + DEFAULT_DIRECTIVES + "\\b(?=.*(\r?\n|\r))";
    //
    // RegExp for code comments. Support single- and multiple-line comments as follows:
    // (1)  # <comment>
    // (2)  // <comment>
    // (3)  /* <comment> */
    // (4)  /*
    //       * <comments> multiple-line
    //       */
    //
    // The regular expressions (in Literal Notation /regexp/g) for (1), (2), (3), (4) respectively are:
    // (1) #[ ]+.*[ ]*(\r?\n|\r)
    // (2) \/\/[ ]*.*[ ]*(\r?\n|\r)  <== The special sign (slash '/') must be escaped with backslash ('\') to '\/'.
    // (3) \/\*[ ]*.*[ ]*\*\/        <== The special sign (start '*') must be escaped with backslash ('\') to '\*'.
    // (4) \/\*([ ]*.*[ ]*(\r?\n|\r)[ ]*\*)+\*?\/(\r?\n|\r)
    //
    // The 4 regular expressions above are combined by OR ('|') operator. Moreover, global ('g') flag is used.
    //
    const DEFAULT_REGEX_COMMENTS = /#[ ]+.*[ ]*(\r?\n|\r)|\/\/[ ]*.*[ ]*(\r?\n|\r)|\/\*[ ]*.*[ ]*\*\/|\/\*([ ]*.*[ ]*(\r?\n|\r)[ ]*\*)+\*?\/(\r?\n|\r)/g; // Line-feed / Carriage-return: \r\n (Win/DOS), \r (older Macs), \n (Linux/Unix)
    //
    // CSS seletor(s)
    //
    const DEFAULT_CSS_SELECTOR_CODE_BLOCKS = "pre.cobe";
    //
    // CSS styles for code blocks, keywords etc.
    //
    const DEFAULT_CSS_STYLE_CODE =
        "padding: 10px 0 10px 14px; overflow-x: scroll;" +
        "font-size: 14px; font-weight: normal; font-style: normal;" +
        "font-family: Consolas, Menlo , Monaco, 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace, 'sans-serif';";
    //
    // Themes for Appearance 
    //
    const DEFAULT_THEMES = {
        DARK : {
            BACKGROUND : "background: #2E3436;",
            FONT_COLOR : "color: #fff;",
            COMMENTS : "color: #33ff46;",
            TYPES : "color: #4198ef;",
            KEYWORDS : "color: #f99df2;",
            DIRECTIVES : "color: #fcb246;"
        },
        STANDARD : {
            BACKGROUND : "background: #cdcbcb;",
            FONT : "color: #000;",
            COMMENTS : "color: #000",
            TYPES : "color: #000;",
            KEYWORDS : "color: #000;",
            DIRECTIVES : "color: #000;"
        }
    };
    //
    // Each code block (<pre>) is an array-element
    //
    let code_blocks = [];
    //
    // Set active display theme
    //
    let theme_active = null;
    //
    // Main program
    //
    return {
        /*
         * init
         *
         * Description: Initialize values
         */
        init : function () {
            code_blocks = document.querySelectorAll(DEFAULT_CSS_SELECTOR_CODE_BLOCKS) || [];
            if ( code_blocks.length == 0 ) {
                return;
            }
            //
            // Set active theme
            //
            theme_active = DEFAULT_THEMES.DARK;
            //
            // Add new function to String prototype to escape special signs
            //
            if ( typeof String.prototype.escapeHTML == 'undefined' ) {
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
            // Start making code prettier
            //
            this.beautify();
        }, // END (init)

        /*
         * match_count
         *
         * Description: Return the number of matches when using "String.prototype.match(regex)"
         * 
         * @params:
         *      str
         *      regex
         * 
         * @return:
         *      Number of matches found
         */
        match_count : function (str, regex) {
            return ( (str || "").match(regex) /* The empty string "" protect this function from crash if match(reg) returns null */
                     || [] /* The [] protects this function from crash if str.match(reg) returns null */
                    ).length;
        }, // END (match_count);

        /*
         * beautify
         *
         * Description: Format and make the code pretty
         */
        beautify : function () {
            for (let i = 0; i < code_blocks.length; i++) {
                //
                // Get a code block
                //
                let block = code_blocks[i];
                //
                // Get content of block. Escape special signs (characters).
                //
                let code = block.innerHTML.escapeHTML();
                //
                // Split content (text) line-by-line separated by delimiter \n, \r\n, \r (line-feed, new-line).
                //
                let regex = /\r?\n|\r/g; // Literal Notation (for \newline, \linefeed)
                                         //   => Faster than RegExp-constructor: new RegExp("regex", "flag")
                                         //   => Line-feed / Carriage-return: \r\n (Win/DOS), \r (older Macs), \n (Linux/Unix)
                let lines = code.split(regex);
                //
                // Search for the white spaces (\t or \x09 (tabulators), \s or [ ] (empty spaces)) in the beginning of line.
                //
                let mint = 25, // (default) number of tabulator (\t, \x09) in the beginning of line. Then, determine the smallest of these numbers (minimum).
                    mins = 25; // (default) number of white spaces (\s) in the beginning of line. Then, determine the smallest of these numbers (minimum).
                               // Note that an \s also contains \n,\t,[ ] etc.
                let counts = {
                    tabus : [], // this array contains the number of tabulators (\tab) in beginning of each line.
                    spaces : []  // this array contains the number of (empty) spaces, but not \tab, in beginning of each line
                }
                lines.forEach( (line, line_index) => { // Iterate through every single line
                    let zeile = line.trimEnd(); // single line
                    if (zeile.trimStart()) { // if (line.trim() !== "")  <== not empty string
                        //
                        // Match all tabulators (\t, \x09) in the beginning of line.
                        // g: (global flag) match all, set RegEx.lastIndex = 0 (first index)
                        // y: (sticky flag) match only from starting position given in property RegEx.lastIndex
                        // URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky
                        // in this case (use only sticky flag 'y'), RegEx.lastIndex should be 0 (first index). Thus, the regex will search for match
                        // from the beginning of line; if found, only the first match is returned. Not all matches. But with the 'g' flag, it will
                        // search for all matches in the given string.
                        //let rex = /\t/y; rex.lastIndex = 0; // set RegEx.lastIndex to 0. That is the first position to begin searching for match.
                        //const ct = COBE.match_count(zeile, /\t/y);
                        const ct = COBE.match_count(zeile, /\t/gy); // short form: combine 'global' (g) and 'sticky' flag (y), since 'g' sets lastIndex = 0 first, then 'g' is ignored and 'y' is started.
                        //
                        // Match all white spaces (\s) in the beginning of line. Similar to the above case with tabulators (\t).
                        // Then subtract <ct> from "COBE.match_count(zeile, /\s/gy)", because an \s corresponds to \n,\t,[ ] etc.
                        //let rex = /\s/y; rex.lastIndex = 0; // set RegEx.lastIndex to 0. That is the first position to begin searching for match.
                        //const cs = COBE.match_count(zeile, /\s/y) - ct;
                        const cs = COBE.match_count(zeile, /\s/gy) - ct; // short form: combine 'global' (g) and 'sticky' flag (y), since 'g' sets lastIndex = 0 first, then 'g' is ignored and 'y' is started.
                        //
                        // Add values to arrays
                        counts.tabus.push(ct);
                        counts.spaces.push(cs);
                        //
                        // Update minimum value (in a single line).
                        if (ct < mint) { mint = ct; }
                        if (cs < mins) { mins = cs; }
                    }
                    else { // if line is empty, then push zero (0) to the arrays respectively => zero tabulator
                        counts.tabus.push(0);
                        counts.spaces.push(0);
                    }
                });
                //
                // Process lines with (overfilled) \tabs
                //
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i].trim(); // remove all white spaces (\t,\r,\n,\f, etc.) in beginning and end of line.
                    if (line) { // if trimmed line is not empty.
                        lines[i] = line; // remove all white spaces (\t,\r,\n,\f, etc.) in beginning and end of line.
                        // Replace 1x \t (tabulator) by 4x dot spaces
                        for (let j = 0; j < (counts.tabus[i]-mint); j++) { // Reduziert die Anzahl von \t (tabulators) auf ein Minimum "mint"
                            lines[i] = "    " + lines[i]; // 1x \t (tabulator) = 4x dot spaces
                        }
                        // Replace 1x dot space also by 1x dot space
                        for (let j = 0; j < (counts.spaces[i]-mins); j++) {
                            lines[i] = " " + lines[i];
                        }
                    }
                }
                //
                // Format every code line
                //
                // For "RegExp Object", to escape the special characters (e.g. star (*)) in string, use the double-backslash (\\) => for example: \\*
                //
                //      Literal notation        |       RexExp Object string        |       Meaning
                //  ============================+===================================+===========================================================
                //          \b                  |           "\\b"                   |   Wortgrenze
                //          \s                  |           "\\s"                   |   White space (empty space, \n, \t, etc...)
                //          \/                  |           "/"                     |   A normal slash "/"
                //          \/\/                |           "//"                    |   Double-slashes for comments, e.g. "// <comments>"
                //          \*                  |           "\\*"                   |   The star (*) sign for comments, e.g. "/* <comments */"
                //
                // Use the "Lookahead Assertion" : "x(?=y)"
                //
                for (let i = 0; i < lines.length; i++) {
                    let index_comment = lines[i].search(/\s*(\/\/|\*|#[ ]+.*).*/g); // index of the first occurence of the <comment> pattern like "// <comment>" or "/* <comment> */" or "# <comment>"
                    if (index_comment != -1) { // lines[i] contains comment (/* <comment> */ or // <comment>)
                        //
                        // format type-keywords
                        regex = new RegExp(DEFAULT_REGEX_TYPES, "gi"); // RegExp object (for types-keyword) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                        if (index_comment > lines[i].search(regex)) { // keyword is outside of comment => color keyword
                            if ( !lines[i].match(/.*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#"
                                lines[i] = lines[i].replace(regex, (match) => {
                                    return "<span style='" + theme_active.TYPES + "'>" + match + "</span>";
                                });
                            }
                        }
                        //
                        // format control-keywords
                        regex = new RegExp(DEFAULT_REGEX_KEYWORDS, "gi"); // RegExp object (for keywords) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                        if (index_comment > lines[i].search(regex)) { // keyword is outside of comment => color keyword
                            if ( !lines[i].match(/.*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#"
                                lines[i] = lines[i].replace(regex, (match) => {
                                    let semicolon = "";
                                    if (match[0] == ";") {
                                        semicolon = ";"; match = match.substring(1);
                                    }
                                    return semicolon + "<span style='" + theme_active.KEYWORDS + "'>" + match + "</span>";
                                });
                            }
                        }
                        //
                        // format directive-keywords
                        regex = new RegExp(DEFAULT_REGEX_DIRECTIVES, "gi"); // RegExp object (for preprocessor directives)
                        if (index_comment > lines[i].search(regex)) { // directives is outside of comment => color directive
                            lines[i] = lines[i].replace(regex, (match) => {
                                return "<span style='" + theme_active.DIRECTIVES + "'>" + match + "</span>";
                            });
                        }
                    }
                    else { // lines[i] has no comment
                        if ( !lines[i].match(/.*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#"
                            //
                            // format type-keywords
                            regex = new RegExp(DEFAULT_REGEX_TYPES, "gi"); // RegExp object (for keywords) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                            lines[i] = lines[i].replace(regex, (match) => {
                                return "<span style='" + theme_active.TYPES + "'>" + match + "</span>";
                            });
                            //
                            // format control-keywords
                            regex = new RegExp(DEFAULT_REGEX_KEYWORDS, "gi"); // RegExp object (for keywords) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                            lines[i] = lines[i].replace(regex, (match) => {
                                let semicolon = "";
                                if (match[0] == ";") {
                                    semicolon = ";"; match = match.substring(1);
                                }
                                return semicolon + "<span style='" + theme_active.KEYWORDS + "'>" + match + "</span>";
                            });
                        }
                        else{
                            //
                            // format directive-keywords
                            regex = new RegExp(DEFAULT_REGEX_DIRECTIVES, "i"); // RegExp object (for preprocessor directives)
                            lines[i] = lines[i].replace(regex, (match) => {
                                return "<span style='" + theme_active.DIRECTIVES + "'>" + match + "</span>";
                            });
                        }
                    }
                }
                //
                // Join all lines to complete code.
                //
                code = lines.join("\r\n");
                //
                // Format comments in code
                //
                code = code.replace(DEFAULT_REGEX_COMMENTS, (match, p, offset, string) => {
                    return "<span style='" + theme_active.COMMENTS + "'>" + match + "</span>";
                });
                //
                // Apply CSS style for code block(s)
                //
                code_blocks[i].style = DEFAULT_CSS_STYLE_CODE + theme_active.BACKGROUND + theme_active.FONT_COLOR;
                //
                // Re-assign formatted code to block
                //
                code_blocks[i].innerHTML = code;
            }
        }, // END (beautify)

    }
})();
// Note: Arrow function loses its own bindings to 'this', 'arguments', 'super' or 'new.target'
document.addEventListener("DOMContentLoaded", () => COBE.init(), false);
