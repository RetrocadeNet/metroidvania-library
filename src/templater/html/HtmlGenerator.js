var MarkdownParser = require('../MarkdownParser');
var _ = require('lodash');
var util = require('util');
var fs = require('fs');

var console = require('../../console');
var globalTokenReplacer = require('./../GlobalTokenReplacer');
var linkTokenReplacer = require('../LinkTokenReplacer');

var Category = require('../../model/Category');
var Series = require('../../model/Series');
var Changelog = require('../../model/Changelog');


var bodyHtml;

module.exports = {
    run: run
};

function run() {
    console.header(0, 'Generating HTML');

    var html = loadTemplateHtml();
    bodyHtml = "";

    renderPreface();
    renderCategories();
    renderGamesList();
    renderCredits();
    renderChangelog();

    console.log(1, util.format('HTML Body rendered (%s characters)', bodyHtml.length));
    html = globalTokenReplacer(html, {'~~~~BODY~~~~': bodyHtml});

    fs.writeFileSync('bin/html/index.html', html);

    console.green(1, util.format("HTML rendered and saved (%s characters)", html.length));
}

function loadTemplateHtml(){
    if (!fs.existsSync('template/html/template.html')){
        throw new Error("HTML Template does no exist (template/html/template.html)!");
    }

    var html = fs.readFileSync('template/html/template.html');
    console.green(1, 'Template file loaded');

    return html;
}

function renderPreface(){
    appendSectionStart('preface', 'Preface');
    appendBody('<div class="preface-container">');
    appendBody('~~~~PREFACE~~~~');
    appendBody('</div>');
    appendSectionClosure();
}

function renderCategories(){
    appendSectionStart('abilities', 'List of Abilities');
    _.forEach(Category.getRootCategories(), renderCategoryWrapper(2));
    appendSectionClosure();
}

function renderGamesList(){
    appendSectionStart('games', 'List of Games');
    _.forEach(Series.getCollection(), renderSeries);
    appendSectionClosure();
}

function renderCredits(){
    appendSectionStart('credits', 'Credits');
    appendSectionClosure();
}

function renderChangelog(){
    appendSectionStart('changelog', 'Changelog');
    _.forEach(Changelog.getCollection(), renderChangelogRow);
    appendSectionClosure();
}

/**
 * @param {number} depth
 */
function renderCategoryWrapper(depth) {
    /**
     * @param {Category} category
     */
    function renderCategory(category) {
        console.log(2, util.format('Rendering category %s', category.name));
        appendBody("<div id='category-div-%s' class='category category-depth-%s'>", category.id, depth);
        appendBody("<h%s id='category-%s'><a href='#category-%s'>%s</a></h%s>", depth, category.id, category.id, category.name, depth);
        appendBody("<p class='description'>%s</p>", category.description);
        if (category.children.length > 0) {
            _.forEach(category.children, renderCategoryWrapper(depth + 1));
        } else if (category.abilities.length > 0) {
            _.forEach(category.abilities, renderAbilityWrapper(depth));
        }
        bodyHtml += "</div>"
    }

    return renderCategory;
}

/**
 * @param {number} depth
 */
function renderAbilityWrapper(depth) {
    /**
     * @param {Ability} ability
     */
    function renderAbility(ability) {
        console.log(3, util.format('Rendering ability %s', ability.name));
        appendBody("<div id='ability-div-%s' class='ability ability-depth-%s'>", ability.id, depth);
        appendBody("<h5 id='ability-%s'><a href='#ability-%s'>%s</a></h5>", ability.id, ability.id, ability.name);
        appendBody('<div class="description">%s</div>', parseBlock(ability.description));
        appendBody('<ul class="game-to-ability-list">');
        _.forEach(ability.gameLinks, renderGameWithAbilityWrapper(depth));
        appendBody('</ul>');
        appendBody('</div>');
    }

    return renderAbility;
}

function renderGameWithAbilityWrapper(){
    /**
     * @param {GameToAbility} gameToAbility
     */
    function renderGameToAbility(gameToAbility){
        appendBody("<li class='game-to-ability'>");
        appendBody('<a class="game-name" href="#game-%s">%s</a>: ', gameToAbility.game.id, gameToAbility.game.name);
        appendBody(parseInline(gameToAbility.description));
        appendBody("</li>");
    }

    return renderGameToAbility;
}

/**
 * @param {Series} series
 */
function renderSeries(series){
    appendBody('<div class="series">');
    appendBody('<h2 id="series-%s"><a href="#series-%s">%s</a></h2>', series.id, series.id, series.name);
    appendBody('<div class="series-body">');
    _.forEach(series.games, renderGame);
    appendBody('</div>');
    appendBody('</div>');
}

/**
 * @param {Game} game
 */
function renderGame(game){
    appendBody('<div class="game">');
    appendBody('<h3 id="game-%s"><a href="#game-%s">%s (%s)</a> <a href="%s">[wiki]</a></h3>', game.id, game.id, game.name, game.date, game.wikiUrl);
    appendBody('<ul class="game-to-ability-list">');
    _.forEach(game.abilityLinks, renderAbilityInGame);
    appendBody('</ul>');
    appendBody('</div>');
}

/**
 * @param {GameToAbility} gameToAbility
 */
function renderAbilityInGame(gameToAbility){
    appendBody("<li class='game-to-ability'>");
    appendBody('<a class="ability-name" href="#ability-%s">%s</a>: ', gameToAbility.ability.id, gameToAbility.ability.name);
    appendBody(parseInline(gameToAbility.description));
    appendBody("</li>");
}
/**
 * @param {Changelog} changelog
 */
function renderChangelogRow(changelog){
    appendBody('<div class="changelog">');
    appendBody('<h4><strong>Version %s:</strong> %s</h4>', changelog.version, changelog.date);
    appendBody('<div class="changelog-body">');
    appendBody(parseBlock(changelog.changes));
    appendBody('</div>');
    appendBody('</div>');
}

function parseBlock(string){
    return MarkdownParser.parseBlock(linkTokenReplacer.replace(string));
}
function parseInline(string){
    return MarkdownParser.parseInline(linkTokenReplacer.replace(string));
}
function appendSectionStart(sectionId, title){
    console.log(1, util.format('Rendering %s', title));
    appendBody('<div class="%s-container section-container">', sectionId);
    appendBody('<h1 id="%s"><a href="#%s">%s</a></h1>', sectionId, sectionId, title);
    appendBody('<div class="section-body">');
}
function appendSectionClosure(){
    appendBody('</div>');
    appendBody('</div>');
    console.log(1, 'Rendered!');
}
function appendBody(){
    bodyHtml += util.format.apply(null, arguments);
}