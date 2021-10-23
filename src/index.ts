import "./index.scss";
import "bootstrap";

const BOOKS_ADDR = "../database/books.json";

// download file and parse json
function get_json(url: string, callback: { (response: any): void; }): void {
    let request = new XMLHttpRequest();
    request.onload = () => {
        if (request.status == 200)
            callback(JSON.parse(request.responseText));
        else
            console.error(`Failed to load json '${url}' with status ${request.status}`);
    };
    request.onerror = () => {
        console.error(`Failed to load json '${url}'`);
    };
    request.open("GET", url, true);
    request.send();
}

type IndexEntry = {
    id: string;
    title: string;
}

type Point = {
    name: string;
    vals: number[];
}

type Book = {
    versions: string[];
    points: Point[];
}

function show_index(): void {
    get_json(BOOKS_ADDR, (books: IndexEntry[]) => {
        let heading = document.getElementById("heading") as HTMLHeadingElement;
        heading.innerText = "Select A Book";
        let possible_books = document.getElementById("possible-books") as HTMLUListElement;
        // add list links
        for (let book of books) {
            let book_bulletin = document.createElement("li");
            possible_books.appendChild(book_bulletin);
            let book_link = document.createElement("a");
            book_bulletin.appendChild(book_link);
            book_link.innerText = book.title;
            book_link.href = `./?book=${book.id}`;
        }
    });
}

function set_book_title(id: string): void {
    get_json(BOOKS_ADDR, (books: IndexEntry[]) => {
        let heading = document.getElementById("heading") as HTMLHeadingElement;
        for (let book of books)
            if (book.id == id) {
                heading.innerText = book.title;
                return;
            }

        heading.innerText = `Error: Can't find book with id '${id}'.`;
    });
}

// convert val from version a to b
function convert(book: Book, val: number, a: number, b: number): { "name": string, "value": number } {
    console.log(`Converting ${val} from version #${a} to #${b}.`)
    let n = book.points.length;
    // capping
    if (val <= book.points[0].vals[a])
        return {
            "name": `1. ${book.points[0].name}`,
            "value": book.points[0].vals[b]
        };
    if (val >= book.points[n - 1].vals[a])
        return {
            "name": `${n}. ${book.points[n - 1].name}`,
            "value": book.points[n - 1].vals[b]
        };

    // get upper bound -> first bigger element
    // TODO: use binary search
    let next = 0;
    while (next < book.points.length && book.points[next].vals[a] <= val) {
        ++next;
    }
    let last = next - 1;
    // point after val
    let next_vals = book.points[next].vals;
    // point before val
    let last_vals = book.points[last].vals;
    // interpolate
    let inclination =
        (next_vals[b] - last_vals[b]) /
        (next_vals[a] - last_vals[a]);
    let difference = (val - last_vals[a]);
    return {
        "name": `${last + 1}. ${book.points[last].name}`,
        "value": Math.round(last_vals[b] + difference * inclination)
    };
}

function load_ui(id: string): void {
    get_json(`../database/${id}.json`, (book: Book) => {
        // set version select options
        let select1 = document.getElementById("select1") as HTMLSelectElement;
        let select2 = document.getElementById("select2") as HTMLSelectElement;
        for (let i = 0; i < book.versions.length; ++i) {
            let option1 = document.createElement("option");
            let option2 = document.createElement("option");
            select1.appendChild(option1);
            select2.appendChild(option2);
            option1.value = i.toString();
            option2.value = i.toString();
            option1.innerText = book.versions[i];
            option2.innerText = book.versions[i];
            // set sane defaults
            if (i == 0)
                option1.selected = true;
            else if (i == 1)
                option2.selected = true;
        }
        let button_left = document.getElementById("convert-left") as HTMLButtonElement;
        let button_right = document.getElementById("convert-right") as HTMLButtonElement;
        let input1 = document.getElementById("input1") as HTMLInputElement;
        let input2 = document.getElementById("input2") as HTMLInputElement;
        let chapter = document.getElementById("chapter") as HTMLParagraphElement;
        button_left.addEventListener("click", () => {
            let converted = convert(book, parseInt(input2.value), parseInt(select2.value), parseInt(select1.value));
            input1.value = converted.value.toString();
            chapter.innerText = `Chapter: ${converted.name}`;
        });
        button_right.addEventListener("click", () => {
            let converted = convert(book, parseInt(input1.value), parseInt(select1.value), parseInt(select2.value));
            input2.value = converted.value.toString();
            chapter.innerText = `Chapter: ${converted.name}`;
        });
    });
}

document.body.onload = () => {
    const url_params = new URLSearchParams(window.location.search);
    let book_id = url_params.get("book");

    // nothing selected?
    if (book_id === null) {
        let ui = document.getElementById("ui") as HTMLDivElement;
        ui.style.visibility = "hidden";
        show_index();
    }
    else {
        set_book_title(book_id);
        load_ui(book_id);
    }
};
