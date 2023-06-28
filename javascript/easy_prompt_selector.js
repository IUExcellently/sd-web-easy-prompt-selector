class EPSElementBuilder {
  // Templates
  static baseButton(text, { size = 'sm', color = 'primary' }) {
    const button = gradioApp().getElementById('txt2img_generate').cloneNode()
    button.id = ''
    button.classList.remove('gr-button-lg', 'gr-button-primary', 'lg', 'primary')
    button.classList.add(
      // gradio 3.16
      `gr-button-${size}`,
      `gr-button-${color}`,
      // gradio 3.22
      size,
      color
    )
    button.textContent = text

    return button
  }

  static tagFields() {
    const fields = document.createElement('div')
    fields.style.display = 'flex'
    fields.style.flexDirection = 'row'
    fields.style.flexWrap = 'wrap'
    fields.style.minWidth = 'min(320px, 100%)'
    fields.style.maxWidth = '100%'
    fields.style.flex = '1 calc(50% - 20px)'
    fields.style.borderWidth = '1px'
    fields.style.borderColor = 'var(--block-border-color,#374151)'
    fields.style.borderRadius = 'var(--block-radius,8px)'
    fields.style.padding = '8px'
    fields.style.height = 'fit-content'

    return fields
  }

  static inputWrapper(id){
    const wrapper = document.createElement('div')
    wrapper.id = id
    wrapper.style.position = 'relative'

    return wrapper
  }

  static inputField(id, { placeholder = '', value = '', onChange }) {
    const input = document.createElement('input')
    input.id = id
    input.type = 'text'
    input.placeholder = placeholder
    input.value = value
    input.style.flex = '1'
    input.style.margin = '2px'
    input.style.width = '160px'
    input.style.borderRadius = 'var(--block-radius,8px)'
    input.style.border = '1px solid rgba(0,0,0,0.1)'
    input.addEventListener('input', (event) => { onChange(event.target.value) })
    return input
  }

  static autocompleteList(id) {
    const autocomplete = document.createElement('div')
    autocomplete.id = id
    autocomplete.style.width = '160px'
    autocomplete.style.maxHeight = '100px'
    autocomplete.style.overflowY = 'scroll'
    autocomplete.style.position= 'absolute'
    autocomplete.style.top= '44px'
    autocomplete.style.left= '2px'
    autocomplete.style.margin= '0'
    autocomplete.style.padding= '0'
    autocomplete.style.listStyle= 'none'
    autocomplete.style.backgroundColor= '#fff'
    autocomplete.style.border= '1px solid #ccc'
    autocomplete.style.display= 'flex'
    autocomplete.style.flexDirection= 'column'
    autocomplete.style.justifyContent= 'flex-start'
    autocomplete.style.paddingLeft= '10px'
    autocomplete.style.borderRadius= 'var(--block-radius,8px)'
    autocomplete.style.padding= '10px'

    return autocomplete
  }


  // Elements
  static openButton({ onClick }) {
    const button = EPSElementBuilder.baseButton('🔯提示词', { size: 'sm', color: 'secondary' })
    button.classList.add('easy_prompt_selector_button')
    button.addEventListener('click', onClick)

    return button
  }

  static areaContainer(id = undefined) {
    const container = gradioApp().getElementById('txt2img_results').cloneNode()
    container.id = id
    container.style.gap = 0
    container.style.display = 'none'

    return container
  }

  static tagButton({ title, onClick, onRightClick, color = 'primary' }) {
    const button = EPSElementBuilder.baseButton(title, { color })
    button.style.height = '2rem'
    button.style.flexGrow = '0'
    button.style.margin = '2px 2px 8px 2px'

    button.addEventListener('click', onClick)
    button.addEventListener('contextmenu', onRightClick)

    return button
  }

  static dropDown(id, options, { onChange }) {
    const select = document.createElement('select')
    select.id = id

    // gradio 3.16
    select.classList.add('gr-box', 'gr-input')

    // gradio 3.22
    select.style.color = 'var(--body-text-color)'
    select.style.backgroundColor = 'var(--input-background-fill)'
    select.style.borderColor = 'var(--block-border-color)'
    select.style.borderRadius = 'var(--block-radius)'
    select.style.margin = '2px'
    select.addEventListener('change', (event) => { onChange(event.target.value) })

    const none = ['空']
    none.concat(options).forEach((key) => {
      const option = document.createElement('option')
      option.value = key
      option.textContent = key
      select.appendChild(option)
    })

    return select
  }

  static checkbox(text, { onChange }) {
    const label = document.createElement('label')
    label.style.display = 'flex'
    label.style.alignItems = 'center'

    const checkbox = gradioApp().querySelector('input[type=checkbox]').cloneNode()
    checkbox.checked = false
    checkbox.addEventListener('change', (event) => {
       onChange(event.target.checked)
    })

    const span = document.createElement('span')
    span.style.marginLeft = 'var(--size-2, 8px)'
    span.textContent = text

    label.appendChild(checkbox)
    label.appendChild(span)

    return label
  }
}

class EasyPromptSelector {
  PATH_FILE = 'tmp/easyPromptSelector.txt'
  AREA_ID = 'easy-prompt-selector'
  SELECT_ID = 'easy-prompt-selector-select'
  CONTENT_ID = 'easy-prompt-selector-content'
  TO_NEGATIVE_PROMPT_ID = 'easy-prompt-selector-to-negative-prompt'
  AUTO_COMPLETE_LIST = []
  CURRENT_KEY = ''
  AUTO_COMPLETE_ID = 'auto-complete-list'

  constructor(yaml, gradioApp) {
    this.yaml = yaml
    this.gradioApp = gradioApp
    this.visible = false
    this.toNegative = false
    this.tags = undefined
  }

  async init() {
    this.tags = await this.parseFiles()

    const tagArea = gradioApp().querySelector(`#${this.AREA_ID}`)
    if (tagArea != null) {
      this.visible = false
      this.changeVisibility(tagArea, this.visible)
      tagArea.remove()
    }

    gradioApp()
      .getElementById('txt2img_toprow')
      .after(this.render())
  }

  async readFile(filepath) {
    const response = await fetch(`file=${filepath}?${new Date().getTime()}`);

    return await response.text();
  }

  async parseFiles() {
    const text = await this.readFile(this.PATH_FILE);
    if (text === '') { return {} }

    const paths = text.split(/\r\n|\n/)

    const tags = {}
    for (const path of paths) {
      const filename = path.split('/').pop().split('.').slice(0, -1).join('.')
      const data = await this.readFile(path)
      yaml.loadAll(data, function (doc) {
        tags[filename] = doc
      })
    }

    return tags
  }

  // Render
  render() {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'center'
    row.style.gap = '10px'

    const dropDown = this.renderDropdown()
    dropDown.style.flex = '1'
    dropDown.style.minWidth = '1'
    row.appendChild(dropDown)

    const inputWrapper = this.renderInputWrapper()
    inputWrapper.style.flex = '1'
    inputWrapper.style.minWidth = '1'

    row.appendChild(inputWrapper)

    const settings = document.createElement('div')
    const checkbox = EPSElementBuilder.checkbox('负面', {
      onChange: (checked) => { this.toNegative = checked }
    })
    settings.style.flex = '1'
    settings.appendChild(checkbox)

    row.appendChild(settings)

    const container = EPSElementBuilder.areaContainer(this.AREA_ID)

    container.appendChild(row)
    container.appendChild(this.renderContent())

    return container
  }

  renderInputWrapper() {
    const inputWrapper = EPSElementBuilder.inputWrapper('input-wrapper')
    const inputField = this.renderInputField()

    inputWrapper.appendChild(inputField)
    return inputWrapper
  }

  renderInputField(){
    const inputField = EPSElementBuilder.inputField('input-field', {
      placeholder:'请输入提示词', value: null, onChange: e =>{
        const inputWrapper = document.getElementById('input-wrapper')
        if(!e){
          debugger
          const autoComplete = document.getElementById(this.AUTO_COMPLETE_ID)
          if (autoComplete) {
            autoComplete.innerHTML = ''
            inputWrapper.removeChild(autoComplete)
          } else {
            console.log(autoComplete)
          }
          return this.AUTO_COMPLETE_LIST = []
        }
        // inputWrapper.appendChild(this.renderAutoComplete())
        const content = gradioApp().getElementById(this.CONTENT_ID)
        const data = this.tags[this.CURRENT_KEY]
        Object.keys(data).forEach((key) => {
          if (typeof data[key] === "object") {
            Object.keys(data[key]).forEach((subKey) => {
              if (subKey.includes(e)) {
                const _obj = new Object()
                _obj[subKey]= data[key][subKey]
                this.AUTO_COMPLETE_LIST.push(_obj)
              }
            });
          } else if (key.includes(e)) {
            const _obj = new Object()
            _obj[key]= data[key]
            this.AUTO_COMPLETE_LIST.push(_obj)
          }
        });
        const autoComplete = document.getElementById(this.AUTO_COMPLETE_ID) ?? this.renderAutoComplete()
        inputWrapper.appendChild(autoComplete)
        if(!this.AUTO_COMPLETE_LIST[0]) return;
        this.AUTO_COMPLETE_LIST.map(item => {
          const tagButton = this.renderTagButton(Object.keys(item)[0], item[Object.keys(item)[0]])
          autoComplete.appendChild(tagButton)
        })
      }
    })
    return inputField
  }



  renderAutoComplete() {
    const autoComplete = EPSElementBuilder.autocompleteList(this.AUTO_COMPLETE_ID)
    // this.AUTO_COMPLETE_LIST.map(item => {
    //   console.log(item)
    //   const tagButton = this.renderTagButton(Object.keys(item)[0], item[Object.keys(item)[0]])
    //   autoComplete.appendChild(tagButton)
    // })


    return autoComplete
  }

  renderDropdown() {
    const dropDown = EPSElementBuilder.dropDown(
      this.SELECT_ID,
      Object.keys(this.tags), {
        onChange: (selected) => {
          const content = gradioApp().getElementById(this.CONTENT_ID)
          Array.from(content.childNodes).forEach((node) => {
            const visible = node.id === `easy-prompt-selector-container-${selected}`
            this.changeVisibility(node, visible)
            this.CURRENT_KEY = selected
          })
        }
      }
    )

    return dropDown
  }

  renderContent() {
    const content = document.createElement('div')
    content.id = this.CONTENT_ID

    Object.keys(this.tags).forEach((key) => {
      const values = this.tags[key]

      const fields = EPSElementBuilder.tagFields()
      fields.id = `easy-prompt-selector-container-${key}`
      fields.style.display = 'none'
      fields.style.flexDirection = 'row'
      fields.style.marginTop = '10px'

      this.renderTagButtons(values, key).forEach((group) => {
        fields.appendChild(group)
      })

      content.appendChild(fields)
    })

    return content
  }

  renderTagButtons(tags, prefix = '') {
    if (Array.isArray(tags)) {
      return tags.map((tag) => this.renderTagButton(tag, tag, 'secondary'))
    } else {
      return Object.keys(tags).map((key) => {
        const values = tags[key]
        const randomKey = `${prefix}:${key}`

        if (typeof values === 'string') { return this.renderTagButton(key, values, 'secondary') }

        const fields = EPSElementBuilder.tagFields()
        fields.style.flexDirection = 'column'

        fields.append(this.renderTagButton(key, `@${randomKey}@`))

        const buttons = EPSElementBuilder.tagFields()
        buttons.id = 'buttons'
        fields.append(buttons)
        this.renderTagButtons(values, randomKey).forEach((button) => {
          buttons.appendChild(button)
        })

        return fields
      })
    }
  }

  renderTagButton(title, value, color = 'primary') {
    return EPSElementBuilder.tagButton({
      title,
      onClick: (e) => {
        e.preventDefault();

        this.addTag(value, this.toNegative || e.metaKey || e.ctrlKey)
      },
      onRightClick: (e) => {
        e.preventDefault();

        this.removeTag(value, this.toNegative || e.metaKey || e.ctrlKey)
      },
      color
    })
  }

  // Util
  changeVisibility(node, visible) {
    node.style.display = visible ? 'flex' : 'none'
  }

  addTag(tag, toNegative = false) {
    const id = toNegative ? 'txt2img_neg_prompt' : 'txt2img_prompt'
    const textarea = gradioApp().getElementById(id).querySelector('textarea')

    if (textarea.value.trim() === '') {
      textarea.value = tag
    } else if (textarea.value.trim().endsWith(',')) {
      textarea.value += ' ' + tag
    } else {
      textarea.value += ', ' + tag
    }

    updateInput(textarea)
  }

  removeTag(tag, toNegative = false) {
    const id = toNegative ? 'txt2img_neg_prompt' : 'txt2img_prompt'
    const textarea = gradioApp().getElementById(id).querySelector('textarea')

    if (textarea.value.trimStart().startsWith(tag)) {
      const matched = textarea.value.match(new RegExp(`${tag.replace(/[-\/\\^$*+?.()|\[\]{}]/g, '\\$&') },*`))
      textarea.value = textarea.value.replace(matched[0], '').trimStart()
    } else {
      textarea.value = textarea.value.replace(`, ${tag}`, '')
    }

    updateInput(textarea)
  }
}

onUiLoaded(async () => {
  yaml = window.jsyaml
  const easyPromptSelector = new EasyPromptSelector(yaml, gradioApp())

  const button = EPSElementBuilder.openButton({
    onClick: () => {
      const tagArea = gradioApp().querySelector(`#${easyPromptSelector.AREA_ID}`)
      easyPromptSelector.changeVisibility(tagArea, easyPromptSelector.visible = !easyPromptSelector.visible)
    }
  })

  const reloadButton = gradioApp().getElementById('easy_prompt_selector_reload_button')
  reloadButton.addEventListener('click', async () => {
    await easyPromptSelector.init()
  })

  const txt2imgActionColumn = gradioApp().getElementById('txt2img_actions_column')
  const container = document.createElement('div')
  container.classList.add('easy_prompt_selector_container')
  container.appendChild(button)
  container.appendChild(reloadButton)

  txt2imgActionColumn.appendChild(container)

  await easyPromptSelector.init()
})
