# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information rega4rding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

##################################################################
#                      SERVER INSTALL HELPER                     #
##################################################################

COMMON_DIR="/usr/lib/python2.6/site-packages/common_functions"
INSTALL_HELPER_AGENT="/var/lib/ambari-agent/install-helper.sh"
COMMON_DIR_SERVER="/usr/lib/ambari-server/lib/common_functions"

PYTHON_WRAPER_TARGET="/usr/bin/ambari-python-wrap"
PYTHON_WRAPER_SOURCE="/var/lib/ambari-server/ambari-python-wrap"

do_install(){
  # setting common_functions shared resource
  rm -rf "$COMMON_DIR"
  ln -s "$COMMON_DIR_SERVER" "$COMMON_DIR"
  # setting python-wrapper script
  if [ ! -f "$PYTHON_WRAPER_TARGET" ]; then
    ln -s "$PYTHON_WRAPER_SOURCE" "$PYTHON_WRAPER_TARGET"
  fi
}

do_remove(){

  rm -rf "$COMMON_DIR"

  if [ -f "$PYTHON_WRAPER_TARGET" ]; then
    rm -f "$PYTHON_WRAPER_TARGET"
  fi

  # if server package exists, restore their settings
  if [ -f "$INSTALL_HELPER_AGENT" ]; then  #  call agent shared files installer
      $INSTALL_HELPER_AGENT install
  fi
}

do_upgrade(){
  do_install
}

case "$1" in
install)
  do_install
  ;;
remove)
  do_remove
  ;;
upgrade)
  do_upgrade
  ;;
esac
