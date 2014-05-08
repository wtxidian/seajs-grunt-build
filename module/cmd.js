/**
 * @author terence.wangt
 * @date 2014-05-06
 * 解析 transport 后的 CMD 模块依赖
 **/

var  ARGV = process.argv
    ,Path = require('path')
    ,http = require('http')
    ,utility = require('./util').util
    ,fs = require('fs')
	,sea = require('seajs')
    ,cycleCache = {}
    ,inDirectory = Path.resolve(ARGV[2])
    ,outDirectory = Path.resolve(ARGV[3])
    ,errorLogfilePath = Path.join(__dirname, '../log/error.log')
    ,normalLogfilePath = Path.join(__dirname, '../log/normal.log')
    ,exec = require('child_process').exec
    ,async = require('async')
    ,OUT_FILE_NAME = 'amdVersion'
    ,appConfigName = 'app.config.js'
    ,is_circle_detect = false
    ,debugMode = parseInt(ARGV[4]);


/**
 * 程序启动入口
 */
function start() {

    var  t1 = new Date()
        ,fileDesMap = {}
        ,outputfile = utility.directoryFilter(outDirectory) + Path.sep + OUT_FILE_NAME;

    cycleCache = {};

    async.series([generateFileMap], function(err, result) {
        if( err ) {
            utility.writeLogToFile(errorLogfilePath, '[Exception]' + err + ' ' + utility.getCurrentTime());
        } else {
            fileDesMap = result[0] || {};

            buildCmdVersionFile(outputfile, fileDesMap);
			
            var usetime = new Date() - t1;

            if( debugMode ) {
                console.log('dependency total const time: ', usetime);
            }

            utility.writeLogToFile(normalLogfilePath, '[info]'  + 'generate dependecies cost time: ' + usetime + ' ' + utility.getCurrentTime());
        }
    });
}



/**
 * 生成文件 map
 * @param callback
 */
function generateFileMap( callback ) {
    var  fileList = generateFileList( inDirectory )
        ,filemapCache = {}
        ,t1 = new Date();

    for(var i = 0,l = fileList.length; i < l; i++ ) {
        var  filePath = fileList[i]
            ,lastModifiedTime = getFileLastModifiedTime(filePath)
            ,newFd = {};

        newFd['lastModified'] = lastModifiedTime;

        filemapCache[filePath] = newFd;
    }

    var usetime = new Date() - t1;

    if( debugMode ) {
        console.log('generate dependecies map const time: ', usetime);
    }

    callback(null, filemapCache);
}


/**
 * 生成style版本文件
 * @param path
 * @param fileMap
 */
function buildCmdVersionFile( outpath,  fileMap) {
    var  record = '';

    var t1 = new Date();

    for( var name in fileMap ) {
        var  dependencies = []
            ,rootDir = getRootDir(name)
            ,prefixDir = getPrefixDir()
            ,relativePath = ''
            ,configs = null;

        //读取根目录下的配置文件

        if( rootDir ) {
            configs = getAppConfigs(rootDir);
			seajs.config(configs);
        }
		
        try {
            if( name.indexOf(Path.sep) !== -1 ) {
                parseDependencies(name, dependencies, configs, prefixDir);
            } else {
                //应用名=stylecombine开启状态
                record += name + '=' + fileMap[name] + '\n';
            }
        } catch (e) {
            if(e.message === 'Find Circular Dependecies!!') {
                throw new Error('Find Circular Dependecies in file: ' + name + '\n' + JSON.stringify(cycleCache) + ' ' + utility.getCurrentTime());
            }
            cycleCache = {};
            throw new Error(e.message + ' ' + name + ' ' + utility.getCurrentTime());
        }
		
	
        // 依赖去重
        dependencies = uniqArray(dependencies);	

        relativePath = getRelativePath(name);
		
		relativePath = relativePath.replace(/\\/g, '/');
		
        if( dependencies.length ) {
            record += relativePath + '=' + dependencies.join(',') + ',' +  relativePath.slice(1) + '\n';
        }
    }

    var parseTime = new Date() - t1;

    if( debugMode ) {
        console.log('parseDependencies cost: ', parseTime);
    }
	
    // Aone中暂时不用生成 cmd 依赖关系的文件，此文件只是在编译阶段为做检查循环依赖和一些异常使用
   try {
       if( record ) {
           fs.appendFileSync(outpath + '.tmp', record);
           fs.renameSync(outpath + '.tmp', outpath);
       }
   }catch(e) {
       utility.writeLogToFile(errorLogfilePath, '[Exception]' + e.message + ' ' + utility.getCurrentTime());
   }
}

/**
 * 递归解析依赖
 * @param path
 */
function parseDependencies( dir, dependencies, configs, rootDir ) {

    var  data = readFile2String(dir)
        ,rComment = /\/\*[^*]*\*+([^/][^*]*\*+)*\//gm
        ,singleLineComment = /\/\/.*$/gm
        ,depends = []
		,configs = configs || {};

    data = data.replace(singleLineComment, '');
    data = data.replace(rComment, '');

    depends = findDependencies(data);

    if( depends.length  ) {
        for( var i = 0; i < depends.length; i++ ) {
            var item = depends[i];
            if( typeof item !== 'undefined' ) {
							
                item = item.replace('/\.js.*/i','');

                var abPath = '';

				var resoveDir = '';
				if (item.charAt(0) === ".") {
			
					var refItem = dir.replace(rootDir,'');
					refItem = refItem.replace(/\\/g, '/');

					resoveDir = seajs.resolve(item, refItem);
					
				}else{
					resoveDir = seajs.resolve(item);
					resoveDir = resoveDir.replace(seajs.config().data.base,'');
				}
				
                if( resoveDir === item ) {
                    continue;
                }
				
                dependencies.push(resoveDir);
				
                abPath = Path.resolve(rootDir, resoveDir);

               if( is_circle_detect ) {
					var isCycle = detectCircular(abPath, configs, rootDir);

				   if( isCycle ) {
					   throw new Error("Find Circular Dependecies!!");
				   } else {
					   parseDependencies(abPath, dependencies, configs, rootDir);
				   }
				} else {
					parseDependencies(abPath, dependencies, configs, rootDir);
				}
            }
        }
    }
}
	
function findDependencies( data ) {
    var  rDefine = /\bdefine\s*\(\s*(['"]([^'"]+)['"]\s*,)?\s*\[([^\]]+)\]/
        ,match = rDefine.exec(data)
        ,depends = [];

    if (!match) {
        return [];
    }

    depends = match[3].split(/,/);

    // 去除数组中的空项
    depends = depends.filter(function(item) {
        return item.trim() !== '';
    });
    // 去除数组中每项的单引号或者双引号
    depends = depends.map(function(item) {
        return (/['"]([^'"]+)['"]/.exec(item) || [])[1];
    });

    return depends;
}


/**
 * 遍历文件目录
 * @param directory
 * @param fileList
 */
function walkDirectory( directory, fileList ) {
    try {
        var dirList = fs.readdirSync(directory);
    

		if( !fs.statSync(directory).isDirectory() ) {
			return;
		}

		dirList.forEach(function(item){
			var filePath = utility.directoryFilter(directory) + Path.sep + item;

			if( item !== '.' && item !== '..' && item !== '.svn' && item !=='.DS_Store' && item !=='.idea' && item !=='.git' ) {
				if(fs.statSync(filePath).isDirectory()){
					walkDirectory(filePath, fileList);
				}else{
					fileList[getRelativePath(filePath)] = filePath;
				}
			}
		});
	} catch (e) {
        utility.writeLogToFile(errorLogfilePath, '[Exception]' + e.message + ' ' + utility.getCurrentTime());
        return;
    }
}

/**
 * 生成文件列表
 * @param path
 * @returns {Array}
 */
function generateFileList( path ) {
    var  fileListArr = []
        ,fileListObj = {}
        ,t1 = new Date();

    walkDirectory(path, fileListObj);

    for( var key in fileListObj ) {
        if ( !fileListObj.hasOwnProperty( key ) ) {
            continue;
        }

        fileListArr.push(fileListObj[key]);

    }

    fileListArr = fileListArr.filter(function(item) {
        var  isJs = /\.js$/i
            ,isJsFile = (isJs.exec(item) || [])[0];

        if( isJsFile ) {
            return true;
        } else {
            return false;
        }

    }) ;

    var usedTime = new Date() - t1;

    if( debugMode ) {
        console.log("generate amd version file list const time: ", usedTime);
    }


    return fileListArr;
}

/**
 * 获取相对路径
 * @param path
 * @returns {*}
 */
function getRelativePath( path ) {
    var  directory = inDirectory
        ,path = path ? path : '';

    var abPath = utility.directoryFilter(directory);

    return path.slice(abPath.length);
}

/**
 * 获取文件的最后修改时间
 * @param filepath
 * @returns {number}
 */
function getFileLastModifiedTime( filepath ) {
    var  stats = null
        ,mtime = 0;

    try {
		if( fs.existsSync(filepath) ) {
			stats = fs.statSync(filepath);
			mtime = new Date(stats.mtime).getTime();  
		}
	} catch(e) {
		utility.writeLogToFile(errorLogfilePath, '[Exception]' + e.message + ' ' + utility.getCurrentTime());
	}

    return mtime;
}

/**
 * 读取文件 GBK
 * @param path
 */
function readFile2String( path ) {
    try {
        if(!fs.existsSync(path)) {
            return '';
        }

        var data = fs.readFileSync(path).toString();

        return data;
		
    } catch(e) {
        utility.writeLogToFile(errorLogfilePath, '[Exception]' + e.message + ' ' + utility.getCurrentTime());
    }
}

/**
 * 读取文件 Buffer
 * @param path
 */
function readFileAsBuffer( path ) {
    try {
        if(!fs.existsSync(path)) {
            return '';
        }

        var data = fs.readFileSync(path);
        return data;
    } catch(e) {
        utility.writeLogToFile(errorLogfilePath, '[Exception]' + e.message + ' ' + utility.getCurrentTime());
    }
}

/**
 * 数组去重
 * @param array
 * @returns {Array}
 */
function uniqArray( array ) {
    var n = {},r=[];
    for(var i = 0; i < array.length; i++) {
        if (!n[array[i]]) {
            n[array[i]] = true;
            r.push(array[i]);
        }
    }
    return r;
}

/**
 * 获得一个文件在配置文件中的输入目录（inDirectory）
 * @returns {string}
 */
function getPrefixDir() {

    var  directory = inDirectory;
    return directory;
}

/**
 * 判断某文件是否存在某目录下（本目录，不做深度遍历）
 * @param dir
 * @param fileName
 * @returns {boolean}
 */
function isFileInDirectory( dir, fileName ) {
    var  hasFile = false
        ,fileArr = [];

    try {
        fileArr = fs.readdirSync(dir);
    } catch (e) {
        utility.writeLogToFile(errorLogfilePath, '[Exception]' + e + ' ' + utility.getCurrentTime());
    }


    if( fileArr.indexOf(fileName) !== -1 ) {
        hasFile = true;
    }

    return hasFile;
}

/**
 * 根据约定好的配置文件名
 * 寻找一个文件所在分支的根目录
 * @param dir
 */
function getRootDir( dir ) {
    var  relativeDir = ''
        ,prefixDir = ''
        ,dirArr = []
        ,tempPath = ''
        ,rootDir = ''
		,prefixDir = getPrefixDir();

	if(isFileInDirectory(prefixDir, appConfigName)) {
		rootDir = prefixDir;
		return rootDir;
	}
		
    relativeDir = getRelativePath(dir);
    dirArr = relativeDir.split(Path.sep);
	
    for( var i = 1; i < dirArr.length - 1; i++ ) {
        var  dirPath = '';

        tempPath += (Path.sep + dirArr[i]);
        dirPath = prefixDir + tempPath;

        if(isFileInDirectory(dirPath, appConfigName)) {
            rootDir = dirPath;
            break;
        }
    }

    return rootDir;
}

/**
 * 获取该分支下的配置信息
 * @param dir
 * @returns {null}
 */
function getAppConfigs( dir ) {
    var  configs = null
        ,configsPath = dir + Path.sep + appConfigName;

    try {
		if( fs.existsSync(configsPath) ) {

			// require cache issue: https://github.com/shimondoodkin/node-hot-reload/issues/1
			var f=require.resolve(configsPath);
			if(require.cache[f]){
				delete require.cache[f];
			}
			
			f=require(f);
			configs = f.configs;
		}
	} catch(e) {
		utility.writeLogToFile(errorLogfilePath, '[Exception]' + e + ' ' + utility.getCurrentTime());

        throw new Error("STYLE_BUILD_ERR" + e);
    }
	
    return configs || {};
}


/**
 * 检测是否存在循环依赖
 */
function detectCircular( item, configs, rootDir ) {
    var  data = ''
		,rComment = /\/\*[^*]*\*+([^/][^*]*\*+)*\//gm
        ,singleLineComment = /\/\/.*$/gm
        ,depends = []
        ,cycle = false;

    data = readFile2String(item);
	data = data.replace(singleLineComment, '');
    data = data.replace(rComment, '');
	
    depends = findDependencies(data);

    depends = depends.map( function( ele ){
        var resoveDir = resolveDir(ele, configs);
        resoveDir = filterId(resoveDir);
        resoveDir = Path.resolve(rootDir, resoveDir);
        return resoveDir + '.js';
    });

    cycleCache[item] = depends;

    cycle = checkCycleCache();

    return cycle;
}

function checkCycleCache() {
    var cycle = false;

    for( var name in cycleCache ) {
        for( var i = 0; i < cycleCache[name].length; i++) {
            if( typeof cycleCache[cycleCache[name][i]] !== 'undefined' ) {
                if( cycleCache[cycleCache[name][i]].length ) {
                    cycleCache[name] = cycleCache[name].concat(cycleCache[cycleCache[name][i]]);
                    cycleCache[name] = uniqArray(cycleCache[name]);
                }
            }

            for( var value in cycleCache ) {
                if( cycleCache[value].indexOf(value) !== -1 ) {
                    cycle = true;
                    return cycle;
                }
            }
        }
    }

    return cycle;
}

start();

