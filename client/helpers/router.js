Router.configure({
    layout: 'layout',
    notFoundTemplate: 'notFound',
    loadingTemplate: 'loading',
    renderTemplates: {
    /* render the templated named footer to the 'footer' yield */
    'footer': { to: 'footer' },

    /* render the template named sidebar to the 'sidebar' yield */
    'header': { to: 'header' }
    },
    before: function() {
    var routeName = this.context.route.name;
    var user = Meteor.user();

    if (_.include(['projects', 'projectList' /*, etc */], routeName) && (!user)) {
      console.log("here");
      this.render(Meteor.loggingIn() ? this.loadingTemplate : 'accessDenied');
      return this.stop();
    }
    }
});



Router.map(function() {
    //Header
    this.route('index', {path: '/'});
    this.route('projectsList', {
        path: '/projects',
        waitOn: function() {return Meteor.subscribe('allprojects',10);},
        data: function() { return { projects: Projects.find({}, {sort: {submitted: -1}, limit: projectHandle.limit()})};},
    });
    this.route('projects', {
        path: '/projects/:_id',
        waitOn: function() {
            Session.set("currentProjectId",this.params._id);
            return Meteor.subscribe('singleProject', this.params._id);
        },
        data: function() { return { projects: Projects.findOne(this.params._id) };}
    });
    this.route('home', {path: '/'});
    this.route('howitworks');
    this.route('pricing');
    this.route('contactus');
    this.route('dashboard');
    //Footer
    this.route('about');
    this.route('faqs');
    this.route('termsofuse');
    this.route('privacypolicy');
});

// Meteor.Router.filters({
//   'requireLogin': function(page) {
//     if (Meteor.user())
//       return page;
//     else if (Meteor.loggingIn())
//       return 'loading';
//     else
//       return 'accessDenied';
//   },
//   'clearErrors': function(page) {
//     clearErrors();
//     return page;
//   }
// });
// Meteor.Router.filter('requireLogin', {only: 'postSubmit'});
// Meteor.Router.filter('clearErrors');