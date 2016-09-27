'use strict'

const vm = require('vm')
const cheerio = require('cheerio')
const { createStore } = require('redux')
const reduce = require('@webdesignio/floorman/reducers').default

exports.buildContext = buildContext

function buildContext ({ components, record, website, meta, language, input }) {
  const $ = cheerio.load(input)
  $('[data-webdesignio-remove]').remove()
  $('[data-component]').each(function () {
    const componentName = $(this).attr('data-component')
    const component = components[componentName]
    if (!component) return
    const props = JSON.parse(($(this).attr('data-props') || '{}'))
    $(this).attr('data-component', null)
    $(this).attr('data-props', null)
    $(this).html(renderComponent({ component, props }))
  })
  return $.html()

  function renderComponent ({ component, props, stream }) {
    const m = { exports: {} }
    const state = {
      locals: Object.assign(
        { noLangFields: [] },
        meta, { fields: record.fields }
      ),
      globals: { noLangFields: website.noLangFields, fields: website.fields },
      defaultLanguage: website.defaultLanguage,
      languages: website.languages,
      currentLanguage: language,
      isEditable: false
    }
    const store = createStore(reduce, state)
    const context = vm.createContext({
      module: m,
      exports: m.exports,
      __PROPS__: Object.assign({}, props, { store })
    })
    vm.runInContext(
      `${component}\n__OUT__ = module.exports(__PROPS__)`,
      context,
      { timeout: 10000 }
    )
    return context.__OUT__
  }
}
