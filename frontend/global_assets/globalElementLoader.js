function htmlToElements(html) {
    var template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
}

const sideNav =
    `<aside class="side-nav">
        <ul>
            <li><a href="/">
                <svg class="svg-inline--fa fa-home fa-w-18 fa-fw" aria-hidden="true" focusable="false"
                data-prefix="fa" data-icon="home" role="img" xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 576 512" data-fa-i2svg="">
                <path fill="#fff" d="M280.37 148.26L96 300.11V464a16 16 0 0 0 16 16l112.06-.29a16 16 0 0 0 15.92-16V368a16 16 0 0 1 16-16h64a16 16 0 0 1 16 16v95.64a16 16 0 0 0 16 16.05L464 480a16 16 0 0 0 16-16V300L295.67 148.26a12.19 12.19 0 0 0-15.3 0zM571.6 251.47L488 182.56V44.05a12 12 0 0 0-12-12h-56a12 12 0 0 0-12 12v72.61L318.47 43a48 48 0 0 0-61 0L4.34 251.47a12 12 0 0 0-1.6 16.9l25.5 31A12 12 0 0 0 45.15 301l235.22-193.74a12.19 12.19 0 0 1 15.3 0L530.9 301a12 12 0 0 0 16.9-1.6l25.5-31a12 12 0 0 0-1.7-16.93z"></path>
            </svg>
            <span>Home</span>
            </a>
        </li>
        <li><a href="/configuration"><img src="/cog.png" alt=""><span>Settings</span></a></li>
        <li><a>
            <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#ff8a00" x="0px" y="0px"
                viewBox="0 0 511.989 511.989" style="enable-background:new 0 0 511.989 511.989;" xml:space="preserve">
                <path fill="#6495ed" d="M110.933,221.782c-4.71,0-8.533,3.823-8.533,8.533v51.2c0,4.71,3.823,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-51.2
				    C119.467,225.605,115.644,221.782,110.933,221.782z"/>
                <path fill="#FFF" d="M111.855,2.304L31.172,34.586C8.448,43,0,54.418,0,76.715v358.477c0,22.298,8.448,33.715,30.959,42.061l81.058,32.427
                    c4.011,1.519,8.038,2.287,11.981,2.287c17.152,0,29.602-14.336,29.602-34.091V34.049C153.6,9.78,134.246-6.126,111.855,2.304z
                    M136.533,477.876c0,10.18-5.035,17.024-12.535,17.024c-1.869,0-3.883-0.401-5.803-1.118L37.103,461.33
                    c-16.102-5.965-20.036-11.102-20.036-26.138V76.715c0-15.036,3.934-20.164,20.241-26.206l80.725-32.29
                    c2.082-0.785,4.087-1.186,5.956-1.186c7.501,0,12.544,6.835,12.544,17.016V477.876z"/>
                <path fill="#FFF" d="M178.133,51.115h120.533c14.114,0,25.6,11.486,25.6,25.6v128c0,4.71,3.814,8.533,8.533,8.533
                    c4.719,0,8.533-3.823,8.533-8.533v-128c0-23.526-19.14-42.667-42.667-42.667H178.133c-4.71,0-8.533,3.823-8.533,8.533
                    S173.423,51.115,178.133,51.115z"/>
                <path fill="#FFF" d="M332.8,298.582c-4.719,0-8.533,3.823-8.533,8.533v128c0,14.114-11.486,25.6-25.6,25.6H179.2
                    c-4.71,0-8.533,3.823-8.533,8.533s3.823,8.533,8.533,8.533h119.467c23.526,0,42.667-19.14,42.667-42.667v-128
                    C341.333,302.405,337.519,298.582,332.8,298.582z"/>
                <path d="M511.343,252.655c-0.435-1.05-1.058-1.988-1.852-2.782l-85.325-85.333c-3.337-3.336-8.73-3.336-12.066,0
                    c-3.337,3.337-3.337,8.73,0,12.066l70.767,70.775H196.267c-4.71,0-8.533,3.823-8.533,8.533c0,4.71,3.823,8.533,8.533,8.533
                    h286.601L412.1,335.215c-3.337,3.337-3.337,8.73,0,12.066c1.664,1.664,3.849,2.5,6.033,2.5c2.185,0,4.369-0.836,6.033-2.5
                    l85.325-85.325c0.794-0.794,1.417-1.732,1.852-2.782C512.205,257.093,512.205,254.738,511.343,252.655z"/>
            </svg>
        <span id="accountSection"></span></a></li>
        </ul>
    </aside>`

const accountSection = `
    Logged in as: <div id="accountUser"></div>
    <button class="styledButton" id="logoutButton" onclick="postLogout()">Logout</button> 
    `

document.body.appendChild(htmlToElements(sideNav));
document.getElementById("accountSection").appendChild(htmlToElements(accountSection));


const cookies = new URLSearchParams(document.cookie.replaceAll("; ","&"))

document.getElementById("accountUser").innerHTML = cookies.get("user")

function postLogout() {
    $.post("/logout-user", {}, function (data, status, xhr) {
        alert("Successful logout");
        document.location.href = "/login";
    })
}