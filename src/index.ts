import "./index.scss";
import "bootstrap";

const books_addr = "../database/books.json";

// download file and parse json
export function get_json(url: string, callback: { (response: any): void; }): void {
    let request = new XMLHttpRequest();
    request.onload = () => {
        if (request.status == 200)
            callback(JSON.parse(request.responseText));
        else
            console.error(`Failed to load json '${url}'`);
    };
    request.onerror = () => {
        console.error(`Failed to load json '${url}'`);
    };
    request.open("GET", url, true);
    request.send();
}

type BookIndex = {
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
    get_json(books_addr, (books: BookIndex[]) => {
        let possible_books = document.getElementById("possible-books") as HTMLUListElement;
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
    let book_title = document.getElementById("book-title") as HTMLHeadingElement;
    get_json(books_addr, (books: BookIndex[]) => {
        for (let book of books) {
            if (book.id == id) {
                book_title.innerText = book.title;
                return;
            }
        }

        console.error(`Can't find book with id '${id}'.`);
    });
}

// convert val from version a to b
function convert(book: Book, val: number, a: number, b: number): { "name": string, "value": number } {
    console.log(`Converting ${val} from version #${a} to #${b}.`)
    let n = book.points.length;
    // capping
    if (val <= book.points[0].vals[a])
        return {
            "name": book.points[0].name,
            "value": book.points[0].vals[b]
        };
    if (val >= book.points[n - 1].vals[a])
        return {
            "name": book.points[n - 1].name,
            "value": book.points[n - 1].vals[b]
        };

    // get upper bound -> first bigger element
    // TODO: use binary search
    let up = 0;
    while (up < book.points.length && book.points[up].vals[a] <= val) {
        ++up;
    }
    let down = up - 1;
    // interpolate
    let inclination =
        (book.points[up].vals[b] - book.points[down].vals[b]) /
        (book.points[up].vals[a] - book.points[down].vals[a]);
    let difference = (val - book.points[down].vals[a]);
    return {
        "name": `${down + 1}. ${book.points[down].name}`,
        "value": Math.round(book.points[down].vals[b] + difference * inclination)
    };
}

function load_ui(id: string): void {
    get_json(`../database/${id}.json`, (book: Book) => {
        // set version select options
        let select1 = document.getElementById("version1-select") as HTMLSelectElement;
        let select2 = document.getElementById("version2-select") as HTMLSelectElement;
        for (let i = 0; i < book.versions.length; ++i) {
            let option1 = document.createElement("option");
            let option2 = document.createElement("option");
            option1.value = i.toString();
            option2.value = i.toString();
            option1.innerText = book.versions[i];
            option2.innerText = book.versions[i];
            select1.appendChild(option1);
            select2.appendChild(option2);
            if (i == 0)
                option1.selected = true;
            else if (i == 1)
                option2.selected = true;
        }
        let button_left = document.getElementById("convert-left") as HTMLButtonElement;
        let button_right = document.getElementById("convert-right") as HTMLButtonElement;
        let version1_input = document.getElementById("version1-input") as HTMLInputElement;
        let version2_input = document.getElementById("version2-input") as HTMLInputElement;
        let chapter = document.getElementById("chapter") as HTMLParagraphElement;
        button_left.addEventListener("click", () => {
            let converted = convert(book, parseInt(version2_input.value), parseInt(select2.value), parseInt(select1.value));
            version1_input.value = converted.value.toString();
            chapter.innerText = `Chapter: ${converted.name}`;
        });
        button_right.addEventListener("click", () => {
            let converted = convert(book, parseInt(version1_input.value), parseInt(select1.value), parseInt(select2.value));
            version2_input.value = converted.value.toString();
            chapter.innerText = `Chapter: ${converted.name}`;
        });
    });
}

document.body.onload = () => {
    const url_params = new URLSearchParams(window.location.search);
    let book_title = document.getElementById("book-title") as HTMLHeadingElement;

    let book_id = url_params.get("book");
    // nothing selected?
    if (book_id === null) {
        book_title.innerText = "Select A Book";
        show_index();
        let ui = document.getElementById("ui") as HTMLDivElement;
        ui.style.visibility = "hidden";
    }
    else {
        set_book_title(book_id);
        load_ui(book_id);
    }
};
