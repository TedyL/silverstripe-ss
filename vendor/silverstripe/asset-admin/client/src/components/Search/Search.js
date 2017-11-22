/* global document */
import i18n from 'i18n';
import React, { PropTypes, Component } from 'react';
import { connect } from 'react-redux';
import ReactDOM from 'react-dom';
import { bindActionCreators } from 'redux';
import FormBuilderLoader from 'containers/FormBuilderLoader/FormBuilderLoader';
import { Collapse } from 'react-bootstrap-ss';
import * as schemaActions from 'state/schema/SchemaActions';
import { reset, initialize } from 'redux-form';
import getIn from 'redux-form/lib/structure/plain/getIn';
import Focusedzone from 'components/Focusedzone/Focusedzone';
import getFormState from 'lib/getFormState';
import classnames from 'classnames';

const identifier = 'AssetAdmin.SearchForm';
const view = {
  NONE: 'NONE',
  VISIBLE: 'VISIBLE',
  EXPANDED: 'EXPANDED',
};

/**
 * @param {Object} filters
 * @returns {boolean}
 */
function hasFilters(filters) {
  return (filters && Object.keys(filters).length > 0);
}

class Search extends Component {
  constructor(props) {
    super(props);

    this.expand = this.expand.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.doSearch = this.doSearch.bind(this);
    this.focusInput = this.focusInput.bind(this);
    this.focusFirstFormField = this.focusFirstFormField.bind(this);
    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this.toggle = this.toggle.bind(this);
    this.open = this.open.bind(this);
    this.state = {
      view: view.NONE,
      searchText: (props.filters && props.filters.name) || '',
    };
  }

  componentWillMount() {
    this.setOverrides(this.props);
  }

  componentWillReceiveProps(props) {
    if (props && (!hasFilters(props.filters) && hasFilters(this.props.filters))) {
      this.clearFormData(props);
    } else if (JSON.stringify(props.filters) !== JSON.stringify(this.props.filters)) {
      this.setOverrides(props);
    }
  }

  componentWillUnmount() {
    this.setOverrides();
  }

  /**
   * Populate search form with search in case a pre-existing search has been queried
   *
   * @param {Object} props
   */
  setOverrides(props) {
    if (props && (
        !hasFilters(props.filters) || this.props.searchFormSchemaUrl !== props.searchFormSchemaUrl
      )) {
      // clear any overrides that may be in place
      const schemaUrl = (props && props.searchFormSchemaUrl) || this.props.searchFormSchemaUrl;
      if (schemaUrl) {
        this.props.actions.schema.setSchemaStateOverrides(schemaUrl, null);
      }
    }

    if (props && (hasFilters(props.filters) && props.searchFormSchemaUrl)) {
      const filters = props.filters || {};
      const overrides = {
        fields: Object
          .keys(filters)
          .map((name) => {
            const value = filters[name];
            return { name, value };
          }),
      };

      // set overrides into redux store, so that it can be accessed by FormBuilder with the same
      // schemaUrl.
      this.props.actions.schema.setSchemaStateOverrides(props.searchFormSchemaUrl, overrides);
    }
  }

  focusInput() {
    if (this.state.view === view.NONE) {
      return;
    }

    const node = ReactDOM.findDOMNode(this);
    if (!node) {
      return;
    }

    const input = node.querySelector('.search__content-field');
    // check that it doesn't already have focus
    if (input !== document.activeElement) {
      input.focus();
      if (input.select) {
        input.select();
      }
    }
  }

  focusFirstFormField() {
    if (this.state.view !== view.EXPANDED) {
      return;
    }

    const node = ReactDOM.findDOMNode(this);
    if (!node) {
      return;
    }

    const form = node.querySelector('.search__filter-panel form');
    if (!form) {
      return;
    }

    const input = form.querySelector('input, textarea, select');
    if (input) {
      input.focus();
      if (input.select) {
        input.select();
      }
    }
  }

  clearFormData(props) {
    this.setState({ searchText: '' });

    const schemaUrl = (props && props.searchFormSchemaUrl) || this.props.searchFormSchemaUrl;
    if (schemaUrl) {
      this.props.actions.schema.setSchemaStateOverrides(schemaUrl, null);
      this.props.actions.reduxForm.initialize(identifier, {}, Object.keys(this.props.formData));
      this.props.actions.reduxForm.reset(identifier);
    }
  }

  handleChange(event) {
    this.setState({ searchText: event.target.value });
  }

  /**
   * Handle enter key submission in search box
   *
   * @param {Object} event
   */
  handleKeyUp(event) {
    if (event.keyCode === 13) {
      this.doSearch();
    }
  }

  open() {
    this.show();
    setTimeout(this.focusInput, 50);
  }

  /**
   * Hide this field.
   * When clicking the "X" button
   */
  hide() {
    this.setState({ view: view.NONE });
  }

  /**
   * Show this field.
   * When clicking the green activate "magnifying glass" button
   */
  show() {
    this.setState({ view: view.VISIBLE });
  }

  /**
   * Expand fully form
   */
  expand() {
    this.setState({ view: view.EXPANDED });
  }

  /**
   * When toggling the advanced button
   */
  toggle() {
    switch (this.state.view) {
      case view.VISIBLE:
        this.expand();
        setTimeout(this.focusFirstFormField, 50);
        break;
      case view.EXPANDED:
        this.show();
        break;
      default:
        // noop
    }
  }

  doSearch() {
    const data = {};

    // Merge data from redux-forms with text field
    if (this.state.searchText) {
      data.name = this.state.searchText;
    }

    // Filter empty values
    Object.keys(this.props.formData).forEach((key) => {
      const value = this.props.formData[key];
      if (value) {
        data[key] = value;
      }
    });

    this.show();
    this.props.onSearch(data);
  }

  render() {
    const formId = `${this.props.id}_ExtraFields`;
    const triggerId = `${this.props.id}_Trigger`;
    const searchText = this.state.searchText;

    // Build classes
    const searchClasses = ['search'];
    const advancedButtonClasses = [
      'btn', 'btn-secondary', 'btn--icon-md', 'btn--no-text',
      'font-icon-down-open', 'search__filter-trigger',
    ];
    let expanded = false;
    switch (this.state.view) {
      case view.EXPANDED:
        expanded = true;
        searchClasses.push('search--active');
        break;
      case view.VISIBLE:
        advancedButtonClasses.push('collapsed');
        searchClasses.push('search--active');
        break;
      case view.NONE:
        advancedButtonClasses.push('collapsed');
        break;
      default:
        // noop
    }

    const searchButtonClasses = classnames(
      'btn',
      'btn-primary',
      'search__submit',
      'font-icon-search',
      'btn--icon-large',
      'btn--no-text',
    );

    const searchTriggerButtonClasses = classnames(
      'btn',
      'btn--no-text',
      'btn-secondary',
      'search__trigger',
      'font-icon-search',
      'btn--icon-large'
    );

    return (
      <Focusedzone onClickOut={this.hide}>
        <div className={searchClasses.join(' ')}>
          <button
            className={searchTriggerButtonClasses}
            type="button"
            title={i18n._t('AssetAdmin.SEARCH', 'Search')}
            aria-owns={this.props.id}
            aria-controls={this.props.id}
            aria-expanded="false"
            onClick={this.open}
            id={triggerId}
          />
          <div id={this.props.id} className="search__group">
            <input
              aria-labelledby={triggerId}
              type="text"
              name="name"
              placeholder={i18n._t('AssetAdmin.SEARCH', 'Search')}
              className="form-control search__content-field"
              onKeyUp={this.handleKeyUp}
              onChange={this.handleChange}
              value={searchText}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <button
              aria-expanded={expanded}
              aria-controls={formId}
              onClick={this.toggle}
              className={advancedButtonClasses.join(' ')}
              title={i18n._t('AssetAdmin.ADVANCED', 'Advanced')}
            >
              <span className="search__filter-trigger-text">
                {i18n._t('AssetAdmin.ADVANCED', 'Advanced')}
              </span>
            </button>
            <button
              className={searchButtonClasses}
              title={i18n._t('AssetAdmin.SEARCH', 'Search')}
              onClick={this.doSearch}
            />
            <button
              onClick={this.hide}
              title={i18n._t('AssetAdmin.CLOSE', 'Close')}
              className="btn font-icon-cancel btn--no-text btn--icon-md search__cancel"
              aria-controls={this.props.id}
              aria-expanded="true"
            />

            <Collapse in={expanded}>
              <div id={formId} className="search__filter-panel">
                <FormBuilderLoader
                  identifier={identifier}
                  schemaUrl={this.props.searchFormSchemaUrl}
                />
              </div>
            </Collapse>
          </div>
        </div>
      </Focusedzone>
    );
  }
}

Search.propTypes = {
  searchFormSchemaUrl: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  filters: PropTypes.object,
  formData: PropTypes.object,
};

function mapStateToProps(state, ownProps) {
  const schema = state.form.formSchemas[ownProps.searchFormSchemaUrl];
  if (!schema || !schema.name) {
    return { formData: {} };
  }
  const form = getIn(getFormState(state), schema.name);
  const formData = (form && form.values) || {};
  return { formData };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: {
      schema: bindActionCreators(schemaActions, dispatch),
      reduxForm: bindActionCreators({ reset, initialize }, dispatch),
    },
  };
}

export { Search as Component, hasFilters };

export default connect(mapStateToProps, mapDispatchToProps)(Search);
