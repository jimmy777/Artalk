import './style/main.less'

import Context from './context'
import ArtalkConfig from '~/types/artalk-config'
import defaults from './defaults'

import CheckerLauncher from './lib/checker'
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
  public static readonly defaults: ArtalkConfig = defaults

  public ctx: Context
  public conf: ArtalkConfig
  public $root: HTMLElement

  public checkerLauncher: CheckerLauncher
  public editor: Editor
  public list: List
  public sidebar: Sidebar

  constructor (customConf: ArtalkConfig) {
    // 配置
    this.conf = { ...Artalk.defaults, ...customConf }
    this.conf.server = this.conf.server.replace(/\/$/, '')

    // 默认 pageKey
    if (!this.conf.pageKey) {
      this.conf.pageKey = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
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
    this.checkerLauncher = new CheckerLauncher(this.ctx)

    // 编辑器
    this.editor = new Editor(this.ctx)
    this.$root.appendChild(this.editor.$el)

    // 评论列表
    this.list = new List(this.ctx)
    this.$root.appendChild(this.list.$el)

    // 侧边栏
    this.sidebar = new Sidebar(this.ctx)
    this.$root.appendChild(this.sidebar.$el)

    // 评论获取
    this.list.fetchComments(0)

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
      const { $wrap: $layerWrap } = GetLayerWrap(this.ctx)
      if ($layerWrap)
        $layerWrap.querySelectorAll<HTMLElement>(`[atk-only-admin-show]`).forEach(item => items.push(item))

      items.forEach(($item: HTMLElement) => {
        if (this.ctx.user.data.isAdmin)
          $item.classList.remove('atk-hide')
        else
          $item.classList.add('atk-hide')
      })
    })

    // 本地用户数据变更
    this.ctx.on('user-changed', () => {
      this.ctx.trigger('check-admin-show-el')
      this.ctx.trigger('list-refresh-ui')
    })
  }

  /** 重新加载 */
  public reload() {
    this.list.fetchComments(0)
  }

  /** 暗黑模式 · 初始化 */
  public initDarkMode() {
    const darkModeClassName = 'atk-dark-mode'

    if (this.conf.darkMode) {
      this.$root.classList.add(darkModeClassName)
    } else {
      this.$root.classList.remove(darkModeClassName)
    }

    // for Layer
    const { $wrap: $layerWrap } = GetLayerWrap(this.ctx)
    if ($layerWrap) {
      if (this.conf.darkMode) {
        $layerWrap.classList.add(darkModeClassName)
      } else {
        $layerWrap.classList.remove(darkModeClassName)
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
