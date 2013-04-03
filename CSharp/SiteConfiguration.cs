using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;
using System.Text.RegularExpressions;

namespace CRG.Web2.Web.SiteEngine
{
    public class SiteConfiguration
    {
        public IList<Entry> Pages { get; internal set; }
        public IList<Regex> PageConditions { get; internal set; }

        public IList<Entry> Sites { get; internal set; }
        public IList<Regex> SiteConditions { get; internal set; }

		public IList<Entry> Kinds { get; internal set; }
		public IList<Entry> Relationships { get; internal set; }

		public IList<Entry> Widgets { get; internal set; }
		public IList<Entry> MasterPages { get; internal set; }
		public IList<Entry> Menus { get; internal set; }
		public IList<Entry> LinkSets { get; internal set; }
		public IList<Entry> NavigationPages { get; internal set; }
		public IList<Entry> NavigationItems { get; internal set; }

        private SiteConfiguration()
        {
            Pages = new List<Entry>();
            PageConditions = new List<Regex>();

            Sites = new List<Entry>();
            SiteConditions = new List<Regex>();

            Kinds = new List<Entry>();
        }

        /// <summary>
        /// The current configuration.
        /// </summary>
        public static SiteConfiguration Current
        {
            get
            {
                SiteConfiguration configuration = HttpRuntime.Cache.Get(_cacheName) as SiteConfiguration;
                if (configuration == null)
                {
                    lock (SyncObject)
                    {
                        configuration = HttpRuntime.Cache.Get(_cacheName) as SiteConfiguration;
                        if (configuration == null)
                        {
                            configuration = Load();
                        }
                    }
                }

                return configuration;
            }
        }

        private static object SyncObject = new Object();
        private static string _cacheName = typeof(SiteConfiguration).AssemblyQualifiedName;

        /// <summary>
        /// Loads the configuration from the database, with caching.
        /// </summary>
        /// <returns>The configuration.</returns>
        public static SiteConfiguration Load()
        {
            SiteConfiguration config = new SiteConfiguration();

            using (Web2DataContext db = new Web2DataContext(false))
            {
                // Load pages
                LoadOptions<Entry> options = new LoadOptions<Entry>();

                // Loading contents
				options.LoadWith(ent => ent.Related, db.Relateds);
				options.LoadWith(ent => ent.Content, db.Contents);

				config.Pages = db.Entries.Where(e => e.KindId == (long)BuiltInKind.Page).ToList(options);
				config.PageConditions = config.Pages
											.Select(a => new Regex(
												(a.XElementValue("UrlPattern") ?? "~#~") + "|pageId=" + a.EntryId.ToString(),
												RegexOptions.IgnoreCase))
											.ToList();
				//foreach (Entry page in pages)
				//{ 
				//    string pattern = page.XElementValue("UrlPattern") ?? "~#~"; //no pattern => no match
				//    pattern += "|pageId=" + page.EntryId.ToString();
				//    config.Pages.Add(page);
				//    config.PageConditions.Add(new Regex(pattern, RegexOptions.IgnoreCase));
				//}

				config.Widgets = db.Entries.Where(e => e.KindId == (long)BuiltInKind.Widget).ToList(options);
				config.MasterPages = db.Entries.Where(e => e.KindId == (long)BuiltInKind.MasterPage).ToList(options);

                // Load sites
				config.Sites = db.Entries.Where(e => e.KindId == (long)BuiltInKind.Site).ToList(options);
				config.SiteConditions = config.Sites
											.Select(a => (new Regex(a.XElementValue("UrlPattern") ?? "", RegexOptions.IgnoreCase)))
											.ToList();


				// Load linksets
				options = new LoadOptions<Entry>();
				options.LoadWith(ent => ent.Links, db.Links);
				options.LoadWith(ent => ent.Related, db.Relateds);
				config.LinkSets = db.Entries.Where(e => e.KindId == (long)BuiltInKind.LinkSet).ToList(options);

				// Load menus
				config.Menus = db.Entries.Where(e => e.KindId == (long)BuiltInKind.Menu).ToList(options);


				// Load navigation pages
				options = new LoadOptions<Entry>();
				options.LoadWith(ent => ent.Related, db.Relateds);
				options.LoadWith(ent => ent.Content, db.Contents);
				config.NavigationPages = db.Entries.Where(e => e.KindId == (long)BuiltInKind.NavigationPage).ToList(options);

				// Load navigation items
				options = new LoadOptions<Entry>();
				options.LoadWith(ent => ent.Links, db.Links);
				options.LoadWith(ent => ent.EntryMedias, db.EntryMedias);
				options.LoadWith(ent => ent.Related, db.Relateds);
				options.LoadWith(ent => ent.Content, db.Contents);
				config.NavigationItems = db.Entries.Where(e => e.KindId == (long)BuiltInKind.NavigationItem).ToList(options);

                // Load kinds
				options = new LoadOptions<Entry>(); 
				options.LoadWith(ent => ent.EntryMedias, db.EntryMedias);
				options.LoadWith(ent => ent.Related, db.Relateds);
				options.LoadWith(ent => ent.Content, db.Contents);
				config.Kinds = db.Entries.Where(e => e.KindId == (long)BuiltInKind.Kind).ToList(options);

				// Load relationships
				options = new LoadOptions<Entry>();
				options.LoadWith(ent => ent.Related, db.Relateds);
				config.Relationships = db.Entries.Where(e => e.KindId == (long)BuiltInKind.Relationship).ToList(options);

            }

            HttpRuntime.Cache.Remove(_cacheName);
            HttpRuntime.Cache.Add(_cacheName, config, null, DateTime.Now.AddMinutes(10), TimeSpan.Zero, System.Web.Caching.CacheItemPriority.Default, null);

            return config;
        }



        /// <summary>
        /// Resolves an Application-path relative location
        /// </summary>
        /// <param name="location">The location</param>
        /// <returns>The absolute location.</returns>
        public string ResolveLocation(string location)
        {
            if (location == null)
            {
                throw new ArgumentNullException("location");
            }

            string appPath = HttpContext.Current.Request.ApplicationPath;

            if (appPath.Length > 1)
            {
                appPath += "/";
            }

            return location.Replace("~/", appPath);
        }
    }
}
