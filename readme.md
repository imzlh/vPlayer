# vPlayer
 - 轻量级播放器，支持3种显示模式(最小化、卡片式、全屏)
 - 支持歌词(LRC)，同时**注重性能**，500ms一次刷新
 - **自适应**，不占地，支持简单的**CUE解析**(允许多个CUE)
 - 不支持跨域，请LRC和CUE都下载至自己的服务器

![PC](view/pc.png)

![Phone](view/phone.png)

## 用途
对于文件管理器(类似我的项目vList)，**前端解析CUE**还是很不错的
然后设计之初只是想实现一遍(Github上很少有这类项目)，仅此而已

## 为什么叫vPlayer?
不是v(ideo)Player，而是v(irtual)Player
用解析CUE的能力生成虚拟歌单，如同真是分开的一样流畅丝滑操作
个人感觉比vlc还好用(切换时明显卡顿)，这就够了

![cuePlay](view/cue.png)

## 使用
示例(index.html)中已经贴出简单用法了
可以参考[文档](http://imzlh.top:81/vplayer/document.html)