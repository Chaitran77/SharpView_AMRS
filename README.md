SharpView_AMRS

# Project Setup Instructions:

### For a RPi 3b+ running Ubuntu Server 23.04 


1) Use `uname -r` to get the Linux Kernel version
2) Go to https://moxa.com/en/support/product-support/software-and-documentation?psid=50306, scroll to `Related Software, Firmware, and Drivers` and then FILTER `Linux Kernel N.x`, where N is the major kernel version obtained above.

> Refer to the README in the Moxa folder for steps 3 and 4

3) Download the `Real TTY Linux Driver (kernel N.x)` Driver, extract the `Moxa` folder to the /home/USER (~) directory, use `sudo bash` to switch into a root shell, `cd Moxa` and execute `./mxinst`.

4) Follow the install instructions (use the defualt ttyMoxa name suggested, `N` for secure mode). Once installed, use `./mxaddsvr` to add the NPort 5232 server with its IP address, port 4001 and 16 ports.
5) Make sure the NPort 5232's Operating Mode is set to `Real COM Mode` for the ports in use.
> DB Setup
6) Setup a MySQL 8 server in line with [this guide](https://hevodata.com/learn/installing-mysql-on-ubuntu-20-04), using https://askubuntu.com/a/1406673 to overcome the `SET PASSWORD has no significance` issue (give the `root` user any secure password).
7) Create a new MySQL user `sharpview_amrs`, with a unique secret password `*83E60833B16CD740875DE610E8515E2C5A884A81` and standard (not administrator) privileges.
    - [Use this](https://stackoverflow.com/a/60214928)
8) Set the environment variable SHARPVIEW_AMRS_DB_PASS to the password in the previous step in /etc/environment

> Node setup
11) Install `forever` globally using `sudo npm install -g forever`

07/2023
