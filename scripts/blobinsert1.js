/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   blobinsert1.js
 *
 * DESCRIPTION
 *   Loads fuzzydinosaur.jpg and INSERTs it into a BLOB column.
 *   Copy any image to example.jpg before running this example.
 *   Use demo.sql to create the required table or do:
 *    DROP TABLE mylobs;
 *    CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var inFileName = 'fuzzydinosaur.jpg';  // contains the image to be inserted

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection)
  {
    if (err) { console.error(err.message); return; }

    connection.execute(
      "INSERT INTO mylobs (id, b) VALUES (:id, EMPTY_BLOB()) RETURNING b INTO :lobbv",
      { id: 2, lobbv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
      { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
      function(err, result)
      {
        if (err) { console.error(err.message); return; }
        if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
          console.error('Error getting a LOB locator');
          return;
        }

        var lob = result.outBinds.lobbv[0];
        lob.on(
          'error',
          function(err)
          {
            console.log("lob.on 'error' event");
            console.error(err);
          });
        lob.on(
          'finish',
          function()
          {
            console.log("lob.on 'finish' event");
            connection.commit(
              function(err)
              {
                if (err)
                  console.error(err.message);
                else
                  console.log("Image uploaded successfully.");
                connection.release(function(err) {
                  if (err) console.error(err.message);
                });
              });
          });

        console.log('Reading from ' + inFileName);
        var inStream = fs.createReadStream(inFileName);
        inStream.on(
          'error',
          function(err)
          {
            console.log("inStream.on 'error' event");
            console.error(err);
            connection.release(function(err) {
              if (err) console.error(err.message);
            });
          });

        inStream.pipe(lob);  // copies the text to the BLOB
      });
  });
