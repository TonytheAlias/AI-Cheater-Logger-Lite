function sendEvent(e, data={}){
    chrome.runtime.sendMessage({
        action:"log_event",
        event: {e, ...data, problem: getProblemName(), timestamp: Date.now() }
    })
}
function getProblemName(){
    const url = window.location.href;

    if (url.includes("leetcode.com")) {
    return window.location.pathname.split("/problems/")[1]?.split("/")[0] || "leetcode-unknown";
  }
    if (url.includes("hackerrank.com")) {
    return window.location.pathname.split("/challenges/")[1]?.split("/")[0] || "hackerrank-unknown";
  }
    if (url.includes("codesignal.com")) {
    return document.title.split("|")[0].trim() || "codesignal-unknown";
  }
  if (url.includes("codility.com")) {
    return document.title.split("|")[0].trim() || "codility-unknown";
  }
  if (url.includes("hackerearth.com")) {
    return window.location.pathname.split("/problem/")[1]?.split("/")[0] || "hackerearth-unknown";
  }

  return "unknown";
}

//Keystrokes tracker
let lastKeyTime = null

document.addEventListener("keydown", e => {
    const currentTime = Date.now()
    let typingSpeed = null

    if(lastKeyTime !== null){
        typingSpeed = currentTime - lastKeyTime
    }
    lastKeyTime = currentTime;

    sendEvent("keystroke", {
        typingSpeed: typingSpeed
    })
    
})

//Pasting
document.addEventListener("paste",()=>{
    sendEvent("paste")
})

//Tab Switches
 document.addEventListener("visibilitychange", () =>{
    if(document.hidden){
        sendEvent("tab_switch")
    }
    else{
        sendEvent("tab_return")
    }
 })

 //Idle detection
 let lastMove = Date.now()
 
 document.addEventListener('mousemove', () => {
    if (Date.now() - lastMove > 10000){
        sendEvent('idle')
    }
    lastMove = Date.now()
 })
 