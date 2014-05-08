/**
 * Created with JetBrains WebStorm.
 * User: dongming
 * Date: 13-8-13
 * Time: 下午4:00
 * To change this template use File | Settings | File Templates.
 */

var  fs = require('fs')
    ,crypto = require('crypto');

var util = {
    /**
     * 获取当前时间的字符串
     * eg.'Tue, 13 Aug 2013 16:25:48 GMT'
     * @returns {*}
     */
    getCurrentTime: function() {
        var  date = new Date()
            ,zoneOffset = date.getTimezoneOffset() * 60000
            ,localTime = date.getTime()
            ,utc = localTime - zoneOffset
            ,nowTime = new Date(utc);

        return nowTime.toUTCString();
    },

    /**
     * 写日志
     * @param path
     * @param content
     */
    writeLogToFile: function( path, content ) {
        try {
            fs.appendFileSync(path, content + '\n');
        } catch (e) {
            throw e;
        }
    },

    /**
     * 获取数据的md5值
     * @param data
     */
    hashMd5: function ( data ) {
        var hash = crypto.createHash('md5');
        return hash.update(data).digest('hex');
    },

    /**
     * 过滤目录路径
     * @param path
     * @returns {*}
     */
    directoryFilter: function( path ) {
        if( path.slice(-1) === '/' ) {
            return path.slice(0, -1);
        } else {
            return path;
        }
    },

    /**
     * 判断一个对象是否是空对象{}
     * @param obj
     * @returns {boolean}
     */
    isEmptyObject: function( obj ) {
        for (var name in obj) {
            return false;
        }
        return true;
    },

    sleep: function(milliSeconds) {
        var startTime = new Date().getTime();
        while (new Date().getTime() < startTime + milliSeconds);
    },

    /**
     * 根据当前时间生成时间戳
     * @returns {string}
     */
    getStampOfNow: function() {
        var  date = new Date()
            ,year = date.getFullYear()
            ,month = date.getMonth() + 1
            ,day = date.getDate()
            ,hours = date.getHours()
            ,minutes = date.getMinutes()
            ,seconds = date.getSeconds();

        return year + '_' + month + '_' + day + '_' + hours + '_' + minutes + '_' + seconds;
    }
};

exports.util = util;
