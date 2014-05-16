var FilterModel = Backbone.Model.extend({
    initialize: function () {
        console.log('model is created');
    },
    defaults: {
        name: 'Filter',
        /**
         * {<field>: {<operator>: <value>}}
         */
        condition: null,
        change: function () {
            var _condition = {};
            _condition[this.get('field')] = {};
            _condition[this.get('field')][this.get('operator')] = this.get('value');
            this.set('condition', _condition);
        },
        render: function () {
            return this.get('condition');
        },
        reset: function () {
            this.set('condition', null);
        }
    }
});

var FilterView = Backbone.View.extend({
    tagName: 'li',

    events: {
        'click button.remove': 'remove',
        'change input,select': 'change'
    },

    initialize: function () {
        _.bindAll(this, 'render', 'unrender', 'remove', 'reset', 'change');
        this.model.bind('change', this.change);
        this.model.bind('remove', this.unrender);
        this.model.bind('reset', this.reset);

        this._create_condition_html = function () {
            var _columns = [];
            columns.forEach(function (d) {
                if (!d.match('dim')) {
                    _columns.push(d);
                }
            });
            var $li = $('<li class="filter-segment-condition">');
            $li
                .append(createSelOpts(
                    createElem('select', {className: 'field', placeholder: 'field name'}),
                    _columns
                ))
                .append(createSelOpts(
                    createElem('select', {className: 'operator'}),
                    [
                        'equal to (=)',
                        'not equal to (!=)',
                        'greater than or equal to (>=)',
                        'greater than (>)',
                        'smaller than or equal to (<=)',
                        'smaller than (<)',
                        'between (e.g. 0-10)',
                        'contains (regex)'
                    ],
                    {
                        'equal to (=)': null,
                        'not equal to (!=)': '$ne',
                        'greater than or equal to (>=)': '$gte',
                        'greater than (>)': '$gt',
                        'smaller than or equal to (<=)': '$lte',
                        'smaller than (<)': '$lt',
                        'between (e.g. 0-10)': 'btwn',
                        'contains (regex)': '$regex'
                    }
                ))
                .append(createElem('input', {className: 'value', placeholder: 'value'}))
                .append(createElem('button', {className: 'reset'}, 'reset'))
                .append(createElem('button', {className: 'remove'}, 'remove'))
//                .append(createElem('div', {className: 'text hidden'}))  //debug
            return $li.html();
        };
    },

    render: function () {
        $(this.el).append(this._create_condition_html());
        return this;
    },

    unrender: function () {
        $(this.el).remove();
    },

    remove: function () {
        this.model.destroy();
    },

    reset: function () {
        $('input', this.el).val('');
        this.model.set('condition', {});
    },

    /**
     * {<field>: {<operator>: <value>}}
     */
    change: function () {
        var field = $('.field', this.el).val(),
            operator = $('.operator', this.el).val(),
            value = $('.value', this.el).val();
        value = !isNaN(Number(value)) ? Number(value) : value;
        var _condition = {};
        _condition[field] = {};
        if (String(operator) == 'null') {  // equal to
            _condition[field] = value;
        } else if (operator == 'btwn') {  // between
            if (value) {
                value = value.split('-');
                if (value.length > 1) {
                    value.forEach(function (d, i) {
                        value[i] = !isNaN(Number(value[i].split(' ').join(''))) ? Number(value[i].split(' ').join('')) : value[i];
                    });
                    _condition[field]['$gte'] = value[0];
                    _condition[field]['$lte'] = value[1];
                }
            }
        } else if (String(operator) != 'null') {
            _condition[field][operator] = value;
        } else {
            //TODO
        }
        this.model.set('condition', _condition);
//        $('div.text', this.el).text(JSON.stringify(this.model.get('condition')));  //debug
    }
});

var FiltersCollection = Backbone.Collection.extend({
    model: FilterModel
});

var FiltersCollectionView = Backbone.View.extend({
    el: '',

    events: {
        'click button#add': 'addItem'
    },

    initialize: function () {
        _.bindAll(this, 'render', 'addItem', 'appendItem', 'change');
        this.counter = 0;
        this.conditions = {};
        this.getConditions = function () {
            if (_size(this.conditions)) {
                return this.conditions
            } else {
                return null;
            }
        };

        this.collection = new FiltersCollection();
        this.collection.bind('add', this.appendItem);
        this.collection.bind('change', this.change);
        this.collection.bind('remove', this.change);

        this.render();
    },

    render: function () {
        var _this = this;
        var $div = $('<div/>')
            .append(createElem('button', {id: 'add'}, 'Add Condition'))
            .append(createElem('div', {className: 'text hidden'}))  //debug
        var $ul = $('<ul class="filter-segment">');
        $(this.el).html($div.append($ul).html());
        _(this.collection.models).each(function (item) { // in case collection is not empty
            _this.appendItem(item);
        }, this);
    },

    addItem: function () {
        this.counter++;
        var item = new FilterModel();
        this.collection.add(item);
    },

    appendItem: function (item) {
        var itemView = new FilterView({
            model: item
        });
        $('ul', this.el).append(itemView.render().el);
    },

    change: function () {
//        $('div.text', this.el).text(JSON.stringify(this.output()));  //debug
        this.conditions = this.output();
    },
    /**
     * output conditions object
     * @returns {object}
     */
    output: function () {
        var _conditions = {};
        _(this.collection.models).each(function (item) {
            var _condition = item.get('condition');
            for (var key in _condition) {
                if (_condition.hasOwnProperty(key)) {
                    _conditions[key] = _condition[key];
                }
            }
        });
        return _conditions;
    }
});