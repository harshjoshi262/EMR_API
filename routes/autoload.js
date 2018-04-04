module.exports = function (app) {
    var rehubMasterRoute = require('./MasterRoute');
    var notificationRoute = require('./NotificationRoute');
    var settingsRoute = require('./SettingsRoute');
    var chatRoute = require('./ChatRoute');
    //var mailboxRoute = require('./MailboxRoute');
    var utilityRoute = require('./UtilityRoute');
    var marRoute = require('./MARRoute');
    var immunisationRoute = require('./ImmunisationRoute');
    var postingRoute = require('./PostingRoute');
    var patientRoute = require('./PatientRoute');
    var templateRoute = require('./TemplateRoute');
    var growthChartRoute = require('./GrowthChartRoute');
    var continuousNoteRoute = require('./ContinuousNoteRoute');
    var orderRoute = require('./OrderRoute');
    require('./SocketRoute');
    app.use(CONSTANT.api_route_path+'master', rehubMasterRoute);
    app.use(CONSTANT.api_route_path+'notification', notificationRoute);
    app.use(CONSTANT.api_route_path+'settings', settingsRoute);
    app.use(CONSTANT.api_route_path+'chat', chatRoute);
    //app.use(CONSTANT.api_route_path+'mail', mailboxRoute);
    app.use(CONSTANT.api_route_path+'utility', utilityRoute);
    app.use(CONSTANT.api_route_path+'mar', marRoute);
    app.use(CONSTANT.api_route_path+'immunisation', immunisationRoute);
    app.use(CONSTANT.api_route_path+'posting', postingRoute);
    app.use(CONSTANT.api_route_path+'patient', patientRoute);
    app.use(CONSTANT.api_route_path+'template', templateRoute);
    app.use(CONSTANT.api_route_path+'growth_chart', growthChartRoute);
    app.use(CONSTANT.api_route_path+'continuous_note', continuousNoteRoute);
    app.use(CONSTANT.api_route_path+'orders', orderRoute);
};


