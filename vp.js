/**
 * vPlayer
 */

// ============ Array AT() ====================
if(undefined == Array.prototype.at)
    Array.prototype.at = function(num){
        if(Math.abs(num) > this.length) return undefined;
        if(num >= 0 ) return this[num];
        else return this[this.length + num];
    };

// ============ DOM API:仿jQuery ===============
var all = HTMLElement.prototype,col = HTMLCollection.prototype;
col.forEach =   function(call){
    for(var i = 0 ; i < this.length ; i ++ ) call(this[i]);
};
col.display =   function(show){
    this.forEach(e=>e.toggle(show));
};
col.hide =     function(){this.forEach(e=>e.style.display='none');};
col.show =     function(){this.forEach(e=>e.style.display='block');};
col.rmClass =  function(cl){
    this.forEach(function(e){
        if(e.classList.contains(cl)) e.classList.remove(cl);
    });
}
all.toggle =    function(show){
    // this.hidden=typeof show == 'boolean'?show:!this.hidden;
    this.style.display = this.style.display=='none'?'block':'none';
};

// ============ API:字符串操作类 ================
/**
 * 获取字符串的缩进数目(空格数)
 * @returns 缩进数目
 */
String.prototype.getIndent = function(){
    for (var i = 0; i < this.length; i++)
        if(this[i] != ' ') return i;
},
/**
 * 将字符串中的缩进删除
 * @returns 没有缩进的内容
 */
String.prototype.noIndent = function(){
    return this.substring(this.getIndent());
},
/**
 * 将字符串中的引用("这是引用的内容")删除
 * @returns 没有引用的内容
 */
String.prototype.inQuote = function(){
    var val = this.matchAll(/\"([\w\W]+?)\"/g).next().value;
    if(val == undefined) return this;
    else return val[1];
},
/**
 * 将时间字符串转换成数字(单位:秒)
 * @param {偏移,如1表示忽略毫秒} offset
 * @returns 时长数字
 */
String.prototype.timeToInt = function(offset){
    var times = this.split(':'),
        table = [24*60*60,60*60,60,1,0.01],
        sec = 0.0;
    if(typeof offset != 'number') offset = 0;
    for (let i = -times.length; i < 0; i++)
        sec += parseInt(times.at(i))*table.at(i-offset);
    return sec;
},
/**
 * 将时间转换成时间字符串(如2:16,12:25)
 * @returns 时间字符串
 */
Number.prototype.timeToString = function(){
    var time = this.toFixed(),
        min = Math.floor(time/60),
        sec = time%60;
    return (min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec);
},
/**
 * 返回数组中最后一个元素
 * @returns 最后一个元素
 */
Array.prototype.end = function(){
    return this[this.length -1];
};

$vp = {
    list : {
        list : [],      // 音频列表(允许RANGE和META)
        /**
         * 解析CUE文本，可以用load()加载URL的CUE文件
         * 如果音频需要前缀URL，如/aaa/{audio}，需要填写prefix
         * @param {CUE文本} cue 
         * @param {URL头} prefix
         */
        parse : function(cue,prefix,cover){
            // CUE类型有一个特殊头
            var file = cue.substr(3).split('\n') , data , inblock , $data, meta = {} , indent , _;
            // 逐行解析
            for (let i = 0; i < file.length; i++)
                if(file[i].trim() == '') continue;  // 空行
                // 没有缩进
                else if(file[i].getIndent() == 0){
                    data = file[i].trim().split(' ',3);
                    if(data[0] == 'REM') continue;  // 注释
                    if(data[0] == 'FILE')           // 文件
                        track = 0,inblock = file[i].trim().inQuote();
                    else    // 作为META保存
                        meta[data[0].toLowerCase()] = file[i].trim().inQuote();
                }else{  // 有缩进
                    data = file[i].trim().split(' ',3),
                    indent = file[i].getIndent();
                    // 2级:在文件中，描述TRACK
                    if(indent == 2){
                        if(data[0] != 'TRACK' || data[2] != 'AUDIO')
                            throw new TypeError('cue.js:(行'+i+')块'+inblock+'中发现未知内容:'+file[i]);
                        if($data != null)           // 上一个TRACK需要保存
                            this.push($data);       // 载入list中
                        $data = {
                            file : prefix+inblock,
                            type : 'cue',
                            performer : meta.performer,
                            cover : cover
                        };     // 刷新data
                    }else if(indent == 4){
                    // 4级:TRACK中的元数据
                        if(data[0] == 'INDEX'){
                            // 音频范围
                            if(!$data.range) $data.range = [data[2].timeToInt()];
                            else $data.range.push(data[2].timeToInt());
                        }else{
                            // 作为元数据保存
                            $data[data[0].toLowerCase()] = file[i].trim().inQuote();
                        }
                    }else{
                        console.error('cue.js:不支持的'+indent+'级缩进(在行'+i+'中)');
                    }
                }
                if($data != null) this.push($data);
                return true;
        },
        /**
         * 从URL获取CUE
         * @param {有CUE的URL地址} url 
         * @param {如果有封面可以填写} cover
         */
        load : function(url,cover,prefix){
            var xhr = new XMLHttpRequest(); 
            xhr.open('GET',url);        // AJAX请求CUE
            if(undefined == prefix) prefix = url.substring(0,url.lastIndexOf('/'));
            xhr.onload = function(){
                if(this.status != 200) 
                    throw new Error('cue.js:加载失败,服务器返回了'+this.status);
                $vp.list.parse(this.responseText,prefix,cover);
            };
            xhr.onerror = function(){
                throw new Error('cue.js:AJAX失败:状态码:'+this.readyState);
            };
            xhr.send();
        },
        /**
         * 将音乐加入到列表，必须包含file(音乐URL路径)
         * 建议包含cover(封面),lrc(歌词路径),performer(演奏者),title(音乐名)
         * @param {音乐数据} opt 
         */
        push : function(opt){
            var e = document.createElement('div'),
                id = this.list.length;
            if(typeof opt.title != 'string') opt.title = decodeURIComponent(opt.file.split('/').end());
            if(typeof opt.performer != 'string') opt.performer = '未知歌手';
            if(typeof opt.cover != 'string') opt.cover = this.setting.cover;
            e.innerHTML = opt.title+' / <span style="color:gray">'+opt.performer+'</span>';
            e.onclick = function(){$vp.set(id);};
            $vp.e.playlist.append(e);
            this.list.push(opt);
        },
        /**
         * 根据ID获取指定的音乐
         * @param {*} i 
         * @returns undefined或包含音乐信息的关联数组
         */
        get : function(i){
            return this.list.at(i || 0);
        }
    },
    // 歌词解析管理模块
    lrc :{
        data:false, // false表示没有歌词
        /**
         * 解析歌词
         * @param {歌词文本} lyrics 
         * @returns 
         */
        parse:function(lyrics){
            var lrc = lyrics.substring(1).split('\n[') , lrd , time , 
                e , box = $vp.e.lrc;
            this.data = {};
            box.innerHTML = ''; // 清空
            for (let i = 0; i < lrc.length; i++) {
                lrd = lrc[i].split(']',2);
                time = lrd[0].timeToInt(1);
                if(isNaN(time))
                    throw new TypeError('lrc.js:这似乎不是歌词');
                this.data[time] = e = document.createElement('p');
                e.innerHTML = lrd[1];       // 新建歌词元素
                box.append(e);              // 插入
            }
            $vp.e.lrc.setAttribute('empty',false);
        },
        /**
         * 从URL加载歌词
         * @param {歌词的URL} url 
         * @returns 
         */
        load:function(url){
            var xhr = new XMLHttpRequest();
            xhr.open('GET',url);
            xhr.onload = function(){
                if(this.status != 200) 
                    throw new Error('lrc.js:加载失败,服务器返回了'+this.status);
                $vp.lrc.parse(this.responseText);
            }
            xhr.onerror = function(){
                throw new Error('lrc.js:AJAX失败:状态码:'+this.readyState);
            }
            xhr.send();
        },
        /**
         * 此函数用于刷新歌词，不建议使用
         * @param {时间} time 
         * @returns 
         */
        update:function(time){
            if(this.data == false) return;              // 没有歌词
            time = Math.floor(time).toString();         // 使用四舍五入
            var target = this.data[time];
            if(!(target instanceof HTMLElement)) return;// 歌词无需更新
            $vp.e.lrc.children.rmClass('current');      // 最大化
            target.classList.add('current');
            // 滚动到用户前
            $vp.e.lrc.scroll(0,target.offsetTop + target.offsetHeight/2 - $vp.e.lrc.offsetHeight/2);
        },
        /**
         * 创建空歌词列表
         */
        empty: function(){
            $vp.e.lrc.setAttribute('empty',true);
            $vp.e.lrc.innerHTML = '';
            this.data = false;
        }
    },
    // BTN操作API
    api:{
        min :       ()=>$vp.to('min'),// 最小化
        card :      ()=>$vp.to('card'),// 卡片模式
        full :      ()=>$vp.to('full'),// 最大化
        switch:     ()=>$vp.to(),   // 自动切换
        playlist :  ()=>$vp.e.backdrop.with($vp.e.playlist),// 播放列表
        voice :     ()=>$vp.e.backdrop.with($vp.e.voice),// 声音控制
        next :      ()=>$vp.set('+'),// 下一曲
        last :      ()=>$vp.set('-'),// 上一曲
        play :      ()=>$vp.play()// 播放/暂停
    },
    // 一大堆HTML元素
    e:{
        box     : document.getElementById('vp'),
        lrc     : document.getElementById('vp_lyrics'),
        player  : document.getElementById('vp_main'),
        btns    : document.querySelectorAll('div#vp .vp_btn,div#vp .vp_inline-btn'),
        play    : {
            playing : document.getElementById('vp_btn_pause'),
            paused  : document.getElementById('vp_btn_play')
        },
        more    : document.getElementById('vp_more'),
        cover   : document.getElementById('vp_cover'),
        title   : document.getElementById('vp_title'),
        timer   : {
            current : document.getElementById('vp_time_current'),
            total   : document.getElementById('vp_time_total'),
            bar     : document.getElementById('vp_time_process'),
            barBox  : document.getElementById('vp_seeker')
        },
        playlist: document.getElementById('vp_dialog_playlist'),
        voice: document.getElementById('vp_dialog_voice'),
        backdrop : document.getElementById('vp_dialog_backdrop'),
        setting:{
            volume: document.getElementById('vp_setting_volume'),
            rate  : document.getElementById('vp_setting_playrate'),
            loop  : document.getElementById('vp_setting_loop')
        }
    },
    /**
     * 切换UI样式，为空自动切换
     * 支持"min"(最小化) "card"(卡片) "full"(全屏)
     * @param {UI模式} mode 
     */
    to:function(mode){
        var modes = {min:'card',card:'full',full:'min'},
            box = $vp.e.box;
        if(typeof mode != 'string') 
            mode = modes[box.getAttribute('mode')] || 'min';
        if(mode == 'full') this.e.more.onresize();
        box.setAttribute('mode',mode);
    },
    /**
     * 播放或暂停(自动判断)，允许指定参数
     * @param {选项,数字则是切换到第n首,字符串(如02:12:20)则是切换到这个时间} opt 
     */
    play : function(opt){
        if(this.e.player.src == '') this.set();
        if(typeof opt == 'string') this.seek(opt);
        else if(typeof opt == 'number') this.set(opt);
        if(this.e.player.paused)
            this.e.player.play();   // 暂停中->播放
        else this.e.player.pause(); // 反之暂停
    },
    range : {}, // CUE专属，在这一段范围中有效
    /**
     * 切换到第n首，当然空值表示重新播放，"+"表示下一首，"-"表示上一首
     * @param {第n首，可选} i 
     */
    set:function(i){
        // 自动决定
        if(undefined == i) i = this.curr_aid;
        else if(i == '+') i = isNaN(this.curr_aid)?0:this.curr_aid+1;
        else if(i == '-') i = this.curr_aid-1;
        // 超界判断
        if(i < 0) i += this.list.list.length;
        else if(i >= this.list.list.length) i -= this.list.list.length;
        // 寻找目标
        var src = this.list.get(i);
        if(src == undefined || typeof src.file != 'string')
            throw new TypeError('vp.js:设置的音频出错!');
        // 获取目标，刷新标题
        var pfm = src.performer
            title = src.title,
            cover = src.cover;
        this.e.title.innerHTML = title+' / <span style="color:gray">'+pfm+'</span>';
        // 解析歌词&设置封面
        if(this.e.player.src != src.file){
            if(src.lrc != undefined) this.lrc.load(src.lrc);
            else this.lrc.empty();
            this.e.cover.style.background = 'url("'+cover+'")',  // 设置封面
            this.e.player.src = src.file;
        }
        // CUE个性化设置
        if(src.type == 'cue'){
            var to = src.range[1] || src.range.end(),
                end = Math.ceil(this.list.get(i+1).range.end());
            this.seek(to);
            // 获取范围
            if(this.list.get(i+1) != undefined)
                this.range = {
                    enable  : true,
                    end     : end,
                    start   : to,
                    duration: end - to
                };
        }else this.range = {};
        this.curr_aid = i;  // 设置音频ID
    },
    seekTo : -1,        // 当可以播放后切换到的时间
    rate   : 1.0,       // 默认播放速度
    loop   : false,     // 循环播放
    /**
     * 切换到一个时间，支持字符串
     * @param {目标时间} time 
     * @returns 
     */
    seek : function(time){
        if(typeof time == 'string') time = time.timeToInt();
        if(this.e.player.readyState < 2) return this.seekto = time;
        if(time > this.e.player.duration)
            throw new TypeError('vp.js:希望播放的值大于总长度');
        this.e.player.currentTime = time;
    }
}
// 初始化API按钮
$vp.e.btns.forEach(function(e){
    var action = e.getAttribute('action');
    if(action == null) return;      // 没有action属性
    e.onclick = $vp.api[action];    // 操作
});
// 初始化range特性
document.getElementsByClassName('vp_range').forEach(e=>e.onclick = function(e){
    var target = e.target , value;
    if(target.tagName != 'R') return true;
    this.children.rmClass('selected');
    target.classList.add('selected');
    value = target.getAttribute('value');
    this.onvaluechange(value);
});
// Box事件监听
(function(b){
    // 右键、长按监听
    b.oncontextmenu = b.ondblclick = function(){
        if(this.getAttribute('mode') == 'min')
            this.setAttribute('mode','card');
        return false;
    }
    // 拖拽移动支持
    function move(xc,yc,x,y){
        b.style.left = `${xc - x}px`,
        b.style.top  = `${yc - y}px`;
    }
    b.onmousedown = function(e){
        if(b.getAttribute('mode') != 'min') return true;
        var oX = e.offsetX,oY = e.offsetY;
        document.onmousemove = function(e){
            b.style.right = 'auto',b.style.bottom = 'auto';
            move(e.pageX,e.pageY,oX,oY);
            return false;
        }
        document.onmouseup = function(){
            document.onmousemove = document.onmouseleave = null;
            // 自动附边
            var val , calc = {
                'top'    : b.offsetTop,
                'left'   : b.offsetLeft,
                'right'  : document.documentElement.clientWidth  - b.offsetLeft - b.clientWidth,
                'bottom' : document.documentElement.clientHeight - b.offsetTop - b.clientHeight
            } , min = document.documentElement.clientWidth , who;
            for (is in calc)
                if(calc[is] < min) min = calc[is] , who = is;
            b.style[who] = '2rem',b.style[{
                'top'   : 'bottom',
                'bottom': 'top',
                'left'  :'right',
                'right' :'left'
            }[who]] = 'auto';
            return false;
        }
        return false;
    }
})($vp.e.box);
// 检查audio支持
if(undefined == HTMLAudioElement){
    $vp = null;     // 清空
    throw new Error('vp.js:你的浏览器不支持VPlayer(audio不受支持)!');
}
// 唯一需要JS计算的大小
(function(){
    var cover = $vp.e.cover;
    $vp.e.more.onresize = function(){
        var rem = parseInt(getComputedStyle(document.documentElement).fontSize),
            vw = document.documentElement.clientWidth,
            vh = document.documentElement.clientHeight
            w = this.clientWidth || vw,h = this.clientHeight || vh;
        if(this instanceof HTMLElement && 50*rem >= vw) return;  // 小屏幕设备无需计算
        cover.style.height = cover.style.width = (w*0.4<=h ? w*0.4 : h) +'px';
    };
})();
// 播放器时间监听
(function(){
    var p = $vp.e.player;
    p.onended = function(){
        if($vp.loop == 'loop') $vp.set();
        else if($vp.loop == 'random') 
            $vp.set(Math.floor($vp.list.list.length * Math.random()));
        else $vp.set('+');
    }   // 自动切换
    p.oncanplay = function(){
        // 初始化时长度并播放
        $vp.e.timer.total.innerHTML = ($vp.range.duration || this.duration).timeToString();
        if($vp.seekto >= 0) {
            this.currentTime = $vp.seekto;
            $vp.seekto = -1;
        }
        this.playbackRate = $vp.rate;
        this.play();
    }
    p.onpause = function(){      // 暂停时
        $vp.e.play.playing.style.display = 'none';
        $vp.e.play.paused.style.display = 'block';
    }
    p.onplay = function(){       // 开始播放时
        $vp.e.play.playing.style.display = 'block';
        $vp.e.play.paused.style.display = 'none';
    }
    p.ontimeupdate = function(){
        var mode = $vp.e.box.getAttribute('mode');
        if($vp.range.end == Math.ceil(this.currentTime) && $vp.range.enable) this.onended();
        if(mode == 'min') return;                          // 最小化模式无需计时器
        if(mode == 'full') $vp.lrc.update(this.currentTime); // 刷新歌词
        // 刷新计时器
        $vp.e.timer.current.innerHTML = ($vp.range.enable
            ? this.currentTime - $vp.range.start
            : this.currentTime).timeToString();
        $vp.e.timer.bar.style.width = $vp.range.enable
            ? (this.currentTime - $vp.range.start)/$vp.range.duration*100 + '%'
            : this.currentTime/this.duration*100 + '%';
    };  // 时间更改时
    p.onvolumechange = function(){// 音量更改
        $vp.e.setting.volume.val = this.volume;
    }
})();
// 切换时长
$vp.e.timer.barBox.onclick = function(e){
    $vp.e.player.currentTime = $vp.range.enable
    ? e.pageX / this.clientWidth * $vp.range.duration + $vp.range.start
    : e.pageX / this.clientWidth * $vp.e.player.duration;
}

// 调节音量、倍速、循环模式
$vp.e.setting.volume.onchange = function(){
    $vp.e.player.volume = this.value;
}
$vp.e.setting.rate.onvaluechange = value =>
    $vp.e.player.playbackRate = $vp.rate = parseFloat(value);
$vp.e.setting.loop.onvaluechange = v=>$vp.loop = v;
// BackDrop全自动背景
$vp.e.backdrop.onclick = function(){
    this.target.style.display = this.style.display = 'none';
}
$vp.e.backdrop.with = function(e){
    if(!e instanceof HTMLElement)
        throw new TypeError('Require HTMLEllement as arguement#1.');
    this.target = e;
    this.style.display = e.style.display = e.style.display == 'none' ? 'block' : 'none';
}