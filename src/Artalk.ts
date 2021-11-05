import './style/main.less'

import Constant from './constant'
import Context from './context'
import ArtalkConfig from '~/types/artalk-config'
import defaultConf from './default-conf'

import Checker from './lib/checker'
import Editor from './components/editor'
import List from './components/list'
import Sidebar from './components/sidebar'

import { GetLayerWrap } from './components/layer'
import { EventPayloadMap, Handler } from '~/types/event'

/**
 * Artalk
 * @link https://artalk.js.org
 */
export default class Artalk {
  public ctx: Context
  public conf: ArtalkConfig
  public $root: HTMLElement

  public checker: Checker
  public editor: Editor
  public list: List
  public sidebar: Sidebar

  constructor (customConf: ArtalkConfig) {
    // 配置
    this.conf = { ...defaultConf, ...customConf }
    this.conf.server = this.conf.server.replace(/\/$/, '')

    // 默认 pageKey
    if (!this.conf.pageKey) {
      this.conf.pageKey = `${window.location.protocol}//'${window.location.host}/${window.location.pathname}`
    }

    // 装载元素
    try {
      const $root = document.querySelector<HTMLElement>(this.conf.el)
      if (!$root) throw Error(`Sorry, target element "${this.conf.el}" was not found.`)
      this.$root = $root
    } catch (e) {
      console.error(e)
      throw new Error('Please check your Artalk `el` config.')
    }

    // Context 初始化
    this.ctx = new Context(this.$root, this.conf)

    // 界面初始化
    this.$root.classList.add('artalk')
    this.$root.innerHTML = ''
    this.initDarkMode()

    // 组件初始化
    this.checker = new Checker(this.ctx)

    // 编辑器
    this.editor = new Editor(this.ctx)
    this.$root.appendChild(this.editor.el)

    // 评论列表
    this.list = new List(this.ctx)
    this.$root.appendChild(this.list.el)

    // 侧边栏
    this.sidebar = new Sidebar(this.ctx)
    this.$root.appendChild(this.sidebar.el)

    // 评论获取
    this.list.reqComments()

    // 事件绑定初始化
    this.initEventBind()
  }

  /** 事件绑定 · 初始化 */
  private initEventBind() {
    // 锚点快速跳转评论
    window.addEventListener('hashchange', () => {
      this.list.checkGoToCommentByUrlHash()
    })

    // 仅管理员显示控制
    this.ctx.on('check-admin-show-el', () => {
      const items: HTMLElement[] = []

      this.$root.querySelectorAll<HTMLElement>(`[atk-only-admin-show]`).forEach(item => items.push(item))

      // for layer
      const { wrapEl: layerWrapEl } = GetLayerWrap(this.ctx)
      if (layerWrapEl)
        layerWrapEl.querySelectorAll<HTMLElement>(`[atk-only-admin-show]`).forEach(item => items.push(item))

      items.forEach((itemEl: HTMLElement) => {
        if (this.ctx.user.data.isAdmin)
          itemEl.classList.remove('atk-hide')
        else
          itemEl.classList.add('atk-hide')
      })
    })

    // 本地用户数据变更
    this.ctx.on('user-changed', () => {
      this.ctx.trigger('check-admin-show-el')
      this.ctx.trigger('list-refresh-ui')
    })
  }

  /** 暗黑模式 · 初始化 */
  public initDarkMode() {
    if (this.conf.darkMode) {
      this.$root.classList.add(Constant.DARK_MODE_CLASSNAME)
    } else {
      this.$root.classList.remove(Constant.DARK_MODE_CLASSNAME)
    }

    // for Layer
    const { wrapEl: layerWrapEl } = GetLayerWrap(this.ctx)
    if (layerWrapEl) {
      if (this.conf.darkMode) {
        layerWrapEl.classList.add(Constant.DARK_MODE_CLASSNAME)
      } else {
        layerWrapEl.classList.remove(Constant.DARK_MODE_CLASSNAME)
      }
    }
  }

  /** 暗黑模式 · 设定 */
  public setDarkMode(darkMode: boolean) {
    this.ctx.conf.darkMode = darkMode
    this.initDarkMode()
  }

  /** 监听事件 */
  public on<K extends keyof EventPayloadMap>(name: K, handler: Handler<EventPayloadMap[K]>) {
    this.ctx.on(name, handler, 'external')
  }

  /** 解除监听事件 */
  public off<K extends keyof EventPayloadMap>(name: K, handler: Handler<EventPayloadMap[K]>) {
    this.ctx.off(name, handler, 'external')
  }

  /** 触发事件 */
  public trigger<K extends keyof EventPayloadMap>(name: K, payload?: EventPayloadMap[K]) {
    this.ctx.trigger(name, payload, 'external')
  }
}
