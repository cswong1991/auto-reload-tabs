class TablesController {
    constructor() {
        this.data = [];
        this.selected_elements = [];
    }

    setData(data) {
        this.data = data;
        this.selected_elements = [];
    }

    renderTable() {
        return '<div><button type="button" class="btn btn-secondary my-1" id="delete-multi">Delete</button></div>' +
            '<table class="table table-hover" > ' +
            '<thead><tr>' +
            '<th scope="col"><input type="checkbox" id="select-all"></th>' +
            '<th scope="col">URL/Domain</th>' +
            '<th scope="col">Action</th>' +
            '</tr></thead>' +
            '<tbody>' + this.renderBody() + '</tbody></table >';
    }

    renderBody() {
        let body = '';
        this.data.forEach(e1 => {
            body += '<tr>' +
                '<td><input class="select-element" type="checkbox" data-key=' + e1 + '></td>' +
                '<td>' + e1 + '</td>' +
                '<td><button type="button" class="btn btn-secondary delete-btn" data-key="' + e1 + '">Delete</button></td></tr>';
        });
        return body;
    }
}