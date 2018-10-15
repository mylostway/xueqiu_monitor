var pageMonitor = (function(){
	
	var CHECK_INTER = 2000;
	
	// 是否暂时遮罩层
	var m_isUseCover = true;
	var m_lastCheckTime = "";	
	var m_filterZuheTitle = {
		"一飞冲天" 	   : 		"@冲天 。。。",
		"2号乌龟" 	   : 		"@乌龟 。。。",
		//"战胜指数投资" : 		"测试-战指",
		"价值发现"     : 		"@价发 。。。",
		"来一个组合"  :			"@myself 。。。"
	};
	
	var _log = function(msg){
		//alert(msg);
		console.log("[log] " + msg);
	};
	
	var _debug = function(msg){
		console.log("[debug] " + msg);
	};
	
	var _bIsUseH5Notify = false;
	var _notifyItem = null;
	var _initNotify = function(){
		if (window.Notification) {
			if(Notification.permission != "denied"){
				Notification.requestPermission(function (permission) {
					if(permission == "granted"){
						_bIsUseH5Notify = true;
					}
				})
			}
		}		
	}
	
	var _h5Notify = function(notifyInfo){
		if(!notifyInfo) {
			_log("错误参数在_h5Notify,notifyInfo为空");
			return;
		}
		var msg = notifyInfo.msg;
		var isHandled = notifyInfo.bIsHandled;
		if(isHandled) return;
		var notification = new Notification("您有新的未读消息，请及时查阅", {
			body: msg || "没有消息！！",
		});
		notification.onclick = function(){			
			notifyInfo.bIsHandled = true;
			notification.close();
			return;
		}
		notification.onclose = function(){
			return;
		}
		
		if(!isHandled) {
			// setTimeout 这里要设置28秒以上（适应自己机器调整），因为当前我机器测试大概26.5秒左右消息框自动消失，28秒的间隔可以保持基本只显示一个消息框！
			setTimeout(function(ni){
				_h5Notify(ni);			
			},28 * 1000,notifyInfo);
		}
		else{
			if(notification) notification.close();
		}
	}
	
	var _notify = function(msg){		
		if(_bIsUseH5Notify){			
			_h5Notify({"msg":msg,"bIsHandled":false});
		}
		else{
			alert("[notify] " + msg);
		}		
	};
	
	var _warn = function(msg){
		//alert("[warn] " + msg);
		console.log("[warn] " + msg);
	};
	
	var _err = function(msg){
		alert("[err] " + msg);
	};
	
	// 刷新页面
	var _refereshPage = function(){
		document.location = document.location;
		_run();
	};
	
	var coverElem = null;
	var _showCover = function(isShow){
		isShow = isShow || false;
		if(isShow && !coverElem){
			coverElem = document.createElement("div");
			coverElem.style="position:absolute;top:0%;left:0%;width:200%;height:500%;background-color:white;z-index:1001";
			coverElem.innerHTML = "<h1 style='top:100%;left:250%;'>Test Page</h1>";
			document.body.appendChild(coverElem);
		}
		
		if(isShow) $(coverElem).css("display","block");
		else $(coverElem).css("display","none");
		
		document.title = "Test Page";
	};
	
	var m_zuheSessionId = 0;
	var m_hasInit = false;
	var m_zuheHtmlItem = null;
	var _init = function(){
		if(m_hasInit) return;
		_initNotify();
		var imBlock = $("#snb_im");
		var imBlockItems = $("#snb_im li.session_item");
		var selItem = null;
		for(var i = 0;i < imBlockItems.length;i++){
			selItem = imBlockItems[i];
			if(selItem.innerText.indexOf("雪球组合") >= 0){
				break;
			}
		}
		m_zuheSessionId = $(selItem).attr("session_id");
		_debug("get m_zuheSessionId=" + m_zuheSessionId);
		selItem.click();
		m_zuheHtmlItem = selItem;
		_showCover(m_isUseCover);
		m_hasInit = true;
	};
	
	var _mainLogic = function(){
		var notifyMsg = "";
		var imDialogs = $("#im_dialogs .im_dialog");
		var selImDialog = null;
		for(var i = 0;i < imDialogs.length;i++){
			selImDialog = $(imDialogs[i]);
			if(selImDialog.attr("session_id") == m_zuheSessionId){
				break;
			}
		}
		
		if(selImDialog.css("display").indexOf("none") >= 0){
			m_zuheHtmlItem.click();
		}
		
		var monitorBlocks = selImDialog.find("div.item_msg_item");
		if(!monitorBlocks){
			_warn("get monitorBlock failed");
			return;
		}
		
		var checkItem = null;
		var curDate = (new Date());
		var tmplastCheckTime = "";
		// 这里假设获取的消息是按时间排序好的（从小到大）
		for(var i = 0;i < monitorBlocks.length;i++){
			checkItem = $(monitorBlocks[monitorBlocks.length - 1 - i]);
			// 非组合调整信息，“杀猪榜”信息
			if(checkItem.html().indexOf("榜首位") >= 0){
				_debug("忽略杀猪榜信息板块");
				continue;
			}
			var checkTimeItem = checkItem.find(".snbim_card_time");
			if(!checkTimeItem || !checkTimeItem.length) {
				_warn("checkTimeItem snbim_card_time null!");
				continue;
			}
			checkTimeItem = checkTimeItem[0];
			var checkTime = checkTimeItem.innerText;
			if(checkTime > tmplastCheckTime){
				tmplastCheckTime = checkTime;
			}
			if(m_lastCheckTime && checkTime <= m_lastCheckTime){
				// 忽略过期消息
				_debug("check if checkTime timeout,checkTime = " + checkTime + ",lastCheckTime = " + m_lastCheckTime);
				break;
			}			
			var checkDate = checkTime.substr(0,checkTime.indexOf(" "));
			var checkDateMonth = parseInt(checkDate.substr(0,checkDate.indexOf("-")));
			var checkDateDay = parseInt(checkDate.substr(checkDate.indexOf("-") + 1));			
			//_debug("show checkDateMonth=" + checkDateMonth + ",checkDateDay=" + checkDateDay)
			if(checkDateMonth < (curDate.getMonth() + 1) || (checkDateMonth == (curDate.getMonth() + 1) && checkDateDay < curDate.getDate())){
				// 忽略过期消息
				_debug("check if checkDate timeout,checkDate = " + checkDate);
				break;
			}
			
			var checkMsgItem = checkItem.find("span.snbim_card_title")[0];
			if(!checkMsgItem) {
				_warn("checkMsgItem null!");
				continue;
			}
			var checkMsg = checkMsgItem.innerText;
			for(var eKey in m_filterZuheTitle){
				if(checkMsg.indexOf(eKey) >= 0){					
					notifyMsg += (m_filterZuheTitle[eKey] + "。。。\n");
				}
			}
		}
		
		m_lastCheckTime = tmplastCheckTime;
		if(notifyMsg) _notify(notifyMsg);
	};
	
	var m_loop = true;
	
	var _loopCycle = function(){
		try{
			_mainLogic();
		}
		catch(e){
			_warn("主逻辑运行现异常：" + e);
		}
		if(m_loop) {
			setTimeout(_loopCycle,CHECK_INTER);
		}
	};
	
	var _run = function(){
		_init();
		setTimeout(_loopCycle,CHECK_INTER);
	};
	
	var _stop = function(){
		m_loop = false;
	};
	
	return {
		run: _run,
		stop : _stop
	};
	
})();

$(document).ready(function(){
	pageMonitor.run();
})
