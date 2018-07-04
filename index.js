import { Parser } from 'commonmark';
import fs from 'fs';

const mdInput = fs.readFileSync('./changelog.md', 'utf8');
const style = fs.readFileSync('./style.css', 'utf8');

const reader = new Parser();
const walker = reader.parse(mdInput).walker();

const releaseToHtml = function(release) {
    let output = '';
    if (release.date) {
        output = `<h2 class="changelog__release">${release.name} - <span class="changelog__release__date">${release.date}</span></h2>\n`;
    } else {
        output = `<h2 class="changelog__release">${release.name}</h2>\n`;
    }

    Object.keys(release.tasks).forEach(taskName => {
        output += `<h3 class="changelog__change-title">${taskName}</h3>\n`;
    
        const task = release.tasks[taskName];
        output += '<ul>\n';
        Object.keys(task).forEach(type => {
            task[type].forEach(subTask => {
                while (subTask.includes('"')) {
                    const indexStartQuote = subTask.indexOf('"');
                    const indexEndQuote = subTask.indexOf('"', indexStartQuote + 1);
                    let quote = subTask.substring(indexStartQuote + 1, indexEndQuote);

                    quote = `<span class='changelog__quote'>${quote}</span>`;

                    const startSubTask = indexStartQuote > 0 ? subTask.substring(0, indexStartQuote) : '';
                    const endSubTask = ((indexEndQuote + 1) >= subTask.length) ? '' : subTask.substring(indexEndQuote + 1);
                    subTask = startSubTask + quote;
                    subTask += endSubTask;
                }
                while (subTask.includes('[')) {
                    const indexStartQuote = subTask.indexOf('[');
                    const indexEndQuote = subTask.indexOf(']', indexStartQuote + 1);
                    let bracket = subTask.substring(indexStartQuote + 1, indexEndQuote);
                    bracket = bracket.charAt(0).toUpperCase() + bracket.slice(1);

                    bracket = `<span class='changelog__regress'>${bracket}</span>`;

                    const startSubTask = indexStartQuote > 0 ? subTask.substring(0, indexStartQuote) : '';
                    const endSubTask = ((indexEndQuote + 1) >= subTask.length) ? '' : subTask.substring(indexEndQuote + 1);
                    subTask = startSubTask + bracket;
                    subTask += endSubTask;
                }
                output += `<li><span class="changelog__badge changelog__badge--${type.toLowerCase()}">${type}</span> ${subTask}</li>\n`;
            });
        });
        output += '</ul>\n';
    });

    return output;
}

const handleTasks = function(walker, event, tasks) {
    if (event.node.level === 3 && event.entering) {
        let type = walker.next().node.literal;
        event = walker.next();
        while (event.node.type !== 'heading') {
            type += event.node.literal;
            event = walker.next();
        }
        event = walker.next();

        while (event && (event.node.type !== "heading" || event.node.level > 3)) {
            switch (event.node.type) {
                case "text":
                    let text = '';
                    while (event.node.type === 'text') {
                        text += event.node.literal;
                        event = walker.next();
                    }
                    let [taskName, taskDesc] = text.split(" - ", 2);
                    if (!(taskName in tasks)) {
                        tasks[taskName] = {
                            [type]:  []
                        };
                    } else if (!(type in tasks[taskName])) {
                        tasks[taskName][type] = [];
                    }
                    tasks[taskName][type].push(taskDesc);
                    break;
                default:
                event = walker.next();
                    break;
            }
        }
    }
    return event;
}

const handleRelease = function(walker, event) {
    if (event.node.level === 2) {
        let releaseNode = walker.next().node;
        let realeaseNodeLiteral = releaseNode.literal;
        let innerEvent = walker.next();
        while (innerEvent.node.type !== 'heading') {
            realeaseNodeLiteral += innerEvent.node.literal;
            innerEvent = walker.next();
        }
        let [releaseName, releaseDate] = realeaseNodeLiteral.split(" - ", 2);

        innerEvent = walker.next();
        let tasks = {};
        while (innerEvent && (innerEvent.node.type !== 'heading' || innerEvent.node.level > 2)) {
            switch (innerEvent.node.type) {
                case 'heading':
                    if (!innerEvent.entering) {
                        innerEvent = walker.next();
                        break;    
                    }

                    innerEvent = handleTasks(walker, innerEvent, tasks);
                    break;
                default:
                    innerEvent = walker.next();
                    break;
            }            
        }
        event = innerEvent;
        //console.log(`${releaseName} at ${releaseDate}`);
        //console.log(tasks);
        if (Object.keys(tasks).length) {
            console.log(releaseToHtml({
                name: releaseName,
                date: releaseDate,
                tasks: tasks
            }));
        }
    }

    return event;
}


console.log(`
<html>
    <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Google+Sans:400|Roboto:400,400italic,500,500italic,700,700italic|Roboto+Mono:400,500,700|Material+Icons">
        <style>${style}</style>
    </head>
    <body>
        <div class="changelog">
        <h1 class="changelog__page-title">Forest Admin</h1>
`);

let event;
let noWalkerNext = false;
while (noWalkerNext || (event = walker.next())) {
    noWalkerNext = false;
    switch (event.node.type) {
        case 'list':
            break;
        case 'item':
            break;
        case 'heading':
            if (event.entering) {
                event = handleRelease(walker, event);
                //noWalkerNext = true;
            }
            break;
    }
}

console.log(`
</body>
</html>
`);