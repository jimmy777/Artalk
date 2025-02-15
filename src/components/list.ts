import '../style/list.less'

import Context from '../context'
import * as Utils from '../lib/utils'
import * as Ui from '../lib/ui'
import Api from '../api'
import ListHTML from './html/list.html?raw'
import ListLite from './list-lite'
import { ListData } from '~/types/artalk-data'

export default class List extends ListLite {
  private $closeCommentBtn!: HTMLElement
  private $openSidebarBtn!: HTMLElement
  private $unreadBadge!: HTMLElement

  constructor (ctx: Context) {
    const el = Utils.createElement(ListHTML)

    super(ctx)

    // 把 listLite $el 变为子元素
    el.querySelector('.atk-list-body')!.append(this.$el)
    this.$el = el

    // 平铺模式
    let flatMode = false
    if (this.ctx.conf.flatMode === 'auto') {
      if (window.matchMedia("(max-width: 768px)").matches)
        flatMode = true
    } else if (this.ctx.conf.flatMode === true) {
      flatMode = true
    }
    this.flatMode = flatMode

    // 分页模式
    this.pageMode = this.conf.pagination?.readMore ? 'read-more' : 'pagination'
    this.pageSize = this.conf.pagination?.pageSize || 20
    this.repositionAt = this.$el

    // 操作按钮
    this.initListActionBtn()

    // copyright
    this.$el.querySelector<HTMLElement>('.atk-copyright')!.innerHTML = `Powered By <a href="https://artalk.js.org" target="_blank" title="Artalk v${ARTALK_VERSION}">Artalk</a>`

    // event listen
    this.ctx.on('list-reload', () => (this.fetchComments(0))) // 刷新评论
    this.ctx.on('list-refresh-ui', () => (this.refreshUI()))
    this.ctx.on('list-import', (data) => (this.importComments(data)))
    this.ctx.on('list-insert', (data) => (this.insertComment(data)))
    this.ctx.on('list-delete', (comment) => (this.deleteComment(comment.id)))
    this.ctx.on('list-update', (updateData) => { updateData(this.data);this.refreshUI() } )
    this.ctx.on('unread-update', (data) => (this.showUnreadBadge(data.notifies?.length || 0)))
  }

  private initListActionBtn() {
    // 侧边栏呼出按钮
    this.$openSidebarBtn = this.$el.querySelector('[data-action="open-sidebar"]')!
    this.$closeCommentBtn = this.$el.querySelector('[data-action="admin-close-comment"]')!
    this.$unreadBadge = this.$el.querySelector('.atk-unread-badge')!

    this.$openSidebarBtn.addEventListener('click', () => {
      this.ctx.trigger('sidebar-show')
    })

    // 关闭评论按钮
    this.$closeCommentBtn.addEventListener('click', () => {
      if (!this.data) return

      this.data.page.admin_only = !this.data.page.admin_only
      this.adminPageEditSave()
    })
  }

  /** 刷新界面 */
  public refreshUI() {
    super.refreshUI()

    this.$el.querySelector<HTMLElement>('.atk-comment-count-num')!.innerText = String(Number(this.data?.total) || 0)

    // 已输入个人信息
    if (!!this.ctx.user.data.nick && !!this.ctx.user.data.email) {
      this.$openSidebarBtn.classList.remove('atk-hide')
    } else {
      this.$openSidebarBtn.classList.add('atk-hide')
    }

    // 仅管理员显示控制
    this.ctx.trigger('check-admin-show-el')
    this.$openSidebarBtn.querySelector<HTMLElement>('.atk-text')!.innerText = (!this.ctx.user.data.isAdmin) ? '通知中心' : '控制中心'

    // 关闭评论
    if (!!this.data && !!this.data.page && this.data.page.admin_only === true) {
      this.ctx.trigger('editor-close')
      this.$closeCommentBtn.innerHTML = '打开评论'
    } else {
      this.ctx.trigger('editor-open')
      this.$closeCommentBtn.innerHTML = '关闭评论'
    }
  }

  protected onLoad(data: ListData, offset: number) {
    super.onLoad(data, offset)

    // 检测锚点跳转
    this.checkGoToCommentByUrlHash()
  }

  /** 跳到评论项位置 - 根据 `location.hash` */
  public async checkGoToCommentByUrlHash () {
    let commentId = Number(Utils.getQueryParam('atk_comment')) // same as backend GetReplyLink()
    if (!commentId) {
      const match = window.location.hash.match(/#atk-comment-([0-9]+)/)
      if (!match || !match[1] || Number.isNaN(Number(match[1]))) return
      commentId = Number(match[1])
    }
    if (!commentId) return

    // 已阅 API
    const notifyKey = Utils.getQueryParam('atk_notify_key')
    if (notifyKey) {
      new Api(this.ctx).markRead(notifyKey)
        .then(() => {
          this.unread = this.unread.filter(o => o.comment_id !== commentId)
          this.ctx.trigger('unread-update', {
            notifies: this.unread
          })
        })
    }

    const comment = this.findComment(commentId)
    // TODO 若找不到评论的情况
    // if (!comment) { // 若找不到评论
    //   if (this.hasMoreComments) { // 阅读更多，并重试
    //     await this.fetchComments()
    //   }
    // }

    if (!comment) return

    Ui.scrollIntoView(comment.getEl(), false)
    window.setTimeout(() => {
      comment.getEl().classList.add('atk-flash-once')
    }, 800)
  }

  /** 管理员设置页面信息 */
  public adminPageEditSave () {
    if (!this.data || !this.data.page) return

    this.ctx.trigger('editor-show-loading')
    new Api(this.ctx).pageEdit(this.data.page)
      .then((page) => {
        if (this.data)
          this.data.page = { ...page }
        this.refreshUI()
      })
      .catch(err => {
        this.ctx.trigger('editor-notify', { msg: `修改页面数据失败：${err.msg || String(err)}`, type: 'e'})
      })
      .finally(() => {
        this.ctx.trigger('editor-hide-loading')
      })
  }

  public showUnreadBadge(count: number) {
    if (count > 0) {
      this.$unreadBadge.innerText = `${Number(count || 0)}`
      this.$unreadBadge.style.display = 'block'
    } else {
      this.$unreadBadge.style.display = 'none'
    }
  }
}
