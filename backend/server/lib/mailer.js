/**
 * Email module. If this is used then npm install nodemailer is needed.
 * Also need to setup smtp.conf then with the right settings for SMTP or
 * pass in a proper SMTP conf and auth objects.
 * 
 * (C) 2020 TekMonks. All rights reserved.
 * See enclosed LICENSE file.
 */
const nodemailer = require("nodemailer");
const crypt = require(CONSTANTS.LIBDIR+"/crypt.js");
const SERVER_CONF = require(`${CONSTANTS.CONFDIR}/smtp.json`);

/**
 * Sends out email using SMTP protocol.
 * @param {string} to Email address of the person to send to
 * @param {string} title The title of the email
 * @param {string} email_html The email's HTML text
 * @param {string} email_text The email's TEXT format text
 * @param {Object} conf A config object that contains {server, port, secure (true|false), from email address}. If not
 *                      provided then conf/smtp.json should contain the right settings.
 * @param {Object} auth An auth object that contains {user, password} for the SMTP server. If not provided then 
 *                      conf/smtp.json should contain the right settings.
 * @returns true on success, and false on failure.
 */
module.exports.email = async function(to, title, email_html, email_text, conf, auth) {
    if (!conf) conf = SERVER_CONF;
    if (!auth) auth = {user: SERVER_CONF.user, pass: crypt.decrypt(SERVER_CONF.password)};

    const smtpConfig = {pool: true, host: conf.server, port: conf.port, secure: conf.secure, auth},
        transporter = nodemailer.createTransport(smtpConfig);

    try {
        const result = await transporter.sendMail({"from": conf.from, "to": to, "subject": title, "text": email_text, "html": email_html});
        LOG.info(`Email sent to ${to} with title ${title} from ${conf.from} with ID ${result.messageId}. Other SMTP information is ${JSON.stringify(result)}.`);
        return true;
    } catch (err) {
        LOG.error(`Email send failed due to ${err}`);
        return false;
    }
}