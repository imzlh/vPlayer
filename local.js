/**
 * vp扩展:localFile
 * 打开本地文件(一般是CUE)
 */
String.prototype.beforeLast = function(char){
    var p = this.lastIndexOf(char);
    if(p == -1) return '';
    else return this.substring(0,p);
};
(function(e){
    var image = [
        "bmp",
        "jpg","jpeg",
        "png",
        "webp",
        "ico","icon",
        "svg"
    ],audio = [
        'wav',
        'mp3',
        'flac',
        'webm','ogg','opus'
    ]
    e.btn.onclick = function(){
        e.file.click();
    };
    e.file.onchange = function(){
        for (let i = 0; i < this.files.length; i++) {
            var ext = this.files[i].name.split('.').end(),
                fr = new FileReader();
            if(ext == 'cue' || ext == 'lrc'){// 歌词或cue
                fr.onload = function(){
                    if(ext == 'cue'){
                        var place = prompt('请输入存放CUE文件的位置!');
                        if(place == '' || place == null)
                            return alert('请输入位置！');
                        $vp.list.parse(this.result,'file://'+place)
                    }else{
                        $vp.list.get($vp.curr_aid).lrctext = this.result;
                        $vp.lrc.parse(this.result);
                    }
                }
                fr.readAsText(this.files[i]);
            }else{
                fr.onload = function(){ 
                    if(image.includes(ext))
                        $vp.list.get($vp.curr_aid).cover = fr.result;
                    else if(audio.includes(ext))
                        $vp.set($vp.list.push({
                            file    : fr.result,
                            title   : e.file.files[i].name.beforeLast('.')
                        }));
                    else return alert('无法识别文件扩展名:'+ext);
                    $vp.set();  // 刷新
                }
                fr.readAsDataURL(this.files[i]);
            }
        }
    }
})({
    file  : document.getElementById('vp_ext_localfile'),
    btn   : document.getElementById('vp_ext_localbtn')
});