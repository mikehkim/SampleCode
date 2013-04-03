using System;
using System.Collections.Generic;
using System.Linq;
using System.Data.Linq;
using System.Xml.Linq;
using System.Text;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;
using System.Web.Script.Serialization;
using System.IO;
using System.Configuration;
using System.Globalization;
using System.Data.Linq.Mapping;
using System.Web;
using System.Text.RegularExpressions;
using System.Runtime.Serialization;
using System.Security.Permissions;
using CRG.Core.Extensions;
using CRG.Core.Utility;

namespace CRG.Web2
{
	public class RelatedValues
	{
		public long RelatedEntryId;
		public long RelId;
		public bool IsFromThisEntry;		
		public string TextValue;
		public double? DoubleValue;
		public DateTime? DateValue;
		public bool? BoolValue;
		public int? IntValue;
		public XElement XmlValue;
		public bool Exists;

		public RelatedValues(bool exists, long relatedEntryId, long relId, bool isFromThisEntry, string textValue, double? doubleValue, DateTime? dateValue, bool? boolValue, int? intValue, XElement xmlValue)
		{
			Exists = exists;
			RelatedEntryId = relatedEntryId;
			RelId = relId;
			IsFromThisEntry = isFromThisEntry;
			TextValue = textValue;
			DoubleValue = doubleValue;
			DateValue = dateValue;
			BoolValue = boolValue;
			IntValue = intValue;
			XmlValue = xmlValue;
		}
		public RelatedValues() { }
	}
    [Serializable]
    //[XmlSchemaProvider("EntrySchemaProvider")]
    //[XmlRoot("entry", Namespace = "http://www.w3.org/2005/Atom")]
    public partial class Entry : ISerializable
    {
        #region compile Query
        public static readonly Func<Web2DataContext, long, long> GetKindId =
            CompiledQuery.Compile<Web2DataContext, long, long>(
                (db, entryId) => db.Entries.Where(r => r.EntryId == entryId).Select(r => r.KindId).Single());

        public static readonly Func<Web2DataContext, long, RelationEntry> GetRelationEntry =
            CompiledQuery.Compile<Web2DataContext, long, RelationEntry>(
            (db, entryId) => db.RelationEntries.SingleOrDefault(e => e.EntryId == entryId));

        public static readonly Func<Web2DataContext, long, IQueryable<KeyValuePair<long, string>>> GetKeyValuePairsByKindId =
            CompiledQuery.Compile<Web2DataContext, long, IQueryable<KeyValuePair<long, string>>>(
                (db, kindId) => db.Entries.Where(r => r.KindId == kindId
                    && (
                        r.PublishedStatus == (int)CRG.Web2.PublishedStatus.Published ||
                        (r.PublishedStatus == (int)CRG.Web2.PublishedStatus.Draft && (r.PublishedEntryId == null || r.PublishedEntryId == 0)) ||
                                (r.PublishedStatus == (int)CRG.Web2.PublishedStatus.Pending && (r.PublishedEntryId == null || r.PublishedEntryId == 0))
                    )
                    ).Select(r => new KeyValuePair<long, string>(r.EntryId, r.Title)));

        public static readonly Func<Web2DataContext, long, string, int, IQueryable<KeyValuePair<long, string>>> GetKeyValuePairByKindIdStartWithTitle =
                CompiledQuery.Compile<Web2DataContext, long, string, int, IQueryable<KeyValuePair<long, string>>>(
                (db, kindId, title, take) => db.Entries.Where(r => r.KindId == kindId
                    && r.Title.StartsWith(title)
                    && (
                        r.PublishedStatus == (int)CRG.Web2.PublishedStatus.Published ||
                        (r.PublishedStatus == (int)CRG.Web2.PublishedStatus.Draft && (r.PublishedEntryId == null || r.PublishedEntryId == 0)) ||
                                (r.PublishedStatus == (int)CRG.Web2.PublishedStatus.Pending && (r.PublishedEntryId == null || r.PublishedEntryId == 0))
                    )
                    )
                    .OrderBy(r => r.Title)
                    .Take(take)
                    .Select(r => new KeyValuePair<long, string>(r.EntryId, r.Title)));

        #endregion


        public Guid GlobalEntryId
        {
            get { return _AuditId; }
            set { _AuditId = value; }
        }
        
        //
        // Comment: Query Methods for retriving Entry from database
        //
        #region Query Methods

        /// <summary>
        /// Retrieves Entry with the specified entryId
        /// </summary>
        /// <param name="entryId">An entryId</param>
        /// <returns>An Entry</returns>
        public static Entry GetById(long entryId)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                return GetById(entryId, db);
            }
        }

        /// <summary>
        /// Retrieves Entry with the specified entryId
        /// </summary>
        /// <param name="entryId">An entryId</param>
        /// <param name="db">A Web2DataContext</param>
        /// <returns>An Entry</returns>
        public static Entry GetById(long entryId, Web2DataContext db)
        {
            return db.Entries.FirstOrDefault(e => e.EntryId == entryId);
        }

        /// <summary>
        /// Retrieves Entry using the specified DataLoadOptions
        /// </summary>
        /// <param name="entryId">An entryId</param>
        /// <param name="dataLoadOptions">A DataLoadOptions object</param>
        /// <returns>An Entry</returns>
        public static Entry GetById(long entryId, DataLoadOptions dataLoadOptions)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                db.LoadOptions = dataLoadOptions;
                return GetById(entryId, db);
            }
        }

        private long? _DraftEntryId = 0;
        public long? DraftEntryId
        {
            get
            {
                if (_DraftEntryId == 0)
                    _DraftEntryId = GetDraftEntryId();
                return _DraftEntryId;                    
            }
        }

        private long? GetDraftEntryId()
        {
            using (Web2DataContext dc = new Web2DataContext(false))
            {
                var draft = dc.Entries.Where(a => a.PublishedEntryId == EntryId).FirstOrDefault();
                if (draft != null)
                    return draft.EntryId;
                else
                    return null;
            }
        }
        #endregion

        //
        // Comment: this region keeps the Elements and XElements of Entry in sync
        //
        #region XElement Properties

        private XElement _XElements;

        [ScriptIgnore]
        [XmlIgnore]
        public XElement XElements
        {
            get
            {
                // Parse XElements from the Elements string of Entry
                if (_XElements == null)
                {
                    _XElements = XElement.Parse("<Elements>" + Elements + "</Elements>");
                    _XElements.Changed += new EventHandler<XObjectChangeEventArgs>(XElements_Changed);
                }

                return _XElements;
            }
        }


        // For Audit and version purpose
        public XElement ElementsValue
        {
            get
            {
                return this.XElements;
            }
        }
        /// <summary>
        /// Set XElements when the Elements changed to keep them in sync
        /// </summary>
        partial void OnElementsChanged()
        {
            _XElements = XElement.Parse("<Elements>" + Elements + "</Elements>");
            _XElements.Changed += new EventHandler<XObjectChangeEventArgs>(XElements_Changed);
        }

        /// <summary>
        /// Set Elements string when the XElements changed to keep them in sync
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        protected void XElements_Changed(object sender, XObjectChangeEventArgs e)
        {
            this.SendPropertyChanging();
            _Elements = _XElements.ToString(SaveOptions.DisableFormatting).Replace("<Elements />", "").Replace("<Elements>", "").Replace("</Elements>", "").Replace("&lt;", "<").Replace("&gt;", ">");
            this.SendPropertyChanged("Elements");
        }

        /// <summary>
        /// For technical reasons, the KindId is changing have to keep track and set it back.
        /// </summary>
        private long oldKindId;
        partial void OnKindIdChanging(long value)
        {
            if (value == 0)
                oldKindId = KindId;
        }
        partial void OnKindIdChanged()
        {
            if (KindId == 0)
                KindId = oldKindId;
        }

        /// <summary>
        /// Returns the value of the specified column, given a column name
        /// </summary>
        /// <param name="name">A column name</param>
        /// <returns>A value of the column</returns>
        public string XElementValue(string name)
        {
            if (XElements.Element(name) != null)
                return XElements.Element(name).Value;
            return null;

        }
        #endregion

        //
        // Comment: this region handles Schedule propreties of Entry
        //
        #region Schedule Properties

        private Schedule _Schedule;

        /// <summary>
        /// Schedule object of this Entry represents Entry schedule in iCal format
        /// </summary>
        [ScriptIgnore]
        [XmlIgnore]
        public Schedule Schedule
        {
            get
            {
                if (_Schedule == null)
                {
                    if (this.SchedulePattern != null)
                    {
                        _Schedule = Schedule.Deserialize(this.SchedulePattern.Replace("\r", ""));
                        _Schedule.EntryID = EntryId;
                    }
                }
                return this._Schedule;
            }
            set
            {
                this._Schedule = value;
                //UpdatePeriods(); //You have to call this function manually after set the Schedule
            }
        }

        /// <summary>
        /// Update Periods of this Entry to be synchonized with the Schedule
        /// </summary>
        public void UpdatePeriods()
        {
            //Insert Periods case
            if (this.Periods == null || this.Periods.Count == 0)
            {
                this.Elements = Entry.MergeElements
                (
                    this.Elements
                    , "<Summary>" + this._Schedule.Summary.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("'", "&#39;").Replace("\"", "&quot;") + "</Summary>"
                    + "<Schedule>" + this._Schedule.iCal.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("'", "&#39;").Replace("\"", "&quot;") + "</Schedule>"
                );

                if (this.Periods == null)
                {
                    Periods = new EntitySet<Period>();
                }

                DateTime time = DateTime.Now.AddYears(3);
                this.Periods.Assign(this._Schedule.CalculatePeriods(time));
            }
            else //Update Periods case
            {
                this.Elements = Entry.MergeElements
                (
                    this.Elements
                    , "<Summary>" + this._Schedule.Summary + "</Summary>"
                    + "<Schedule>" + this._Schedule.iCal + "</Schedule>"
                );

                //Update schedule to be the new one after today
                //Previous periods (scheduled after today) will be replaced
                EntitySet<Period> newPeriods = this._Schedule.CalculatePeriods(DateTime.Now.AddYears(3));

                EntitySet<Period> removed = this.Periods.Where(s => s.StartTime >= DateTime.Today).ToEntitySet().ExceptByStartandEndTime(newPeriods);
                EntitySet<Period> added = newPeriods.ExceptByStartandEndTime(this.Periods);

                this.Periods.AddRange(added);
                this.Periods.RemoveRange(removed);

                //Set all the periods from today to have PeriodId = 0
                //Mark them as a "newly added" periods
                foreach (Period p in this.Periods.Where(s => s.StartTime >= DateTime.Today))
                {
                    this.Periods.Where(s => s.PeriodId == p.PeriodId).FirstOrDefault().PeriodId = 0;
                }
            }
        }

        #endregion

        //
        // Comment: this region holds a list of relationships for this Entry
        //
        #region Entry relationships
        /*
        private List<Relationship> _RelationshipList = new List<Relationship>();

        /// <summary>
        /// Returns a list of relationships of the specified entry.
        /// </summary>
        public List<Relationship> RelationshipList
        {
            get
            {
                return _RelationshipList;
            }
        }

        /// <summary>
        /// Adds a relationship to the specified entry.
        /// </summary>
        public void AddRelationshipList(Relationship r)
        {
            _RelationshipList.Add(r);
        }
         * */
        #endregion Entry relationships

        //
        // Comment: implements ISerializable interface for session state server serialization
        //
        #region ISerializable implementation

        protected Entry(SerializationInfo info, StreamingContext context)
        {

            EntryId = info.GetInt64("EntryId");
            KindId = info.GetInt64("KindId");
            AuditId = (Guid)info.GetValue("AuditId", typeof(Guid));
            Title = info.GetString("Title") != null ? info.GetString("Title").MakeXml10Friendly() : null;
            DateUpdated = info.GetDateTime("DateUpdated");
            DateCreated = info.GetDateTime("DateCreated");
            try
            {
                UpdatedBy = info.GetString("UpdatedBy");
            }
            catch (SerializationException) { /* Nullable Attribute */ }

            PublishedStatus = info.GetInt32("PublishedStatus");

            try
            {
                PublishedEntryId = info.GetInt64("PublishedEntryId");
            }
            catch (SerializationException) { /* Nullable Attribute */ }

            try
            {
                PublishOnDate = info.GetDateTime("PublishOnDate");
            }
            catch (SerializationException) { /* Nullable Attribute */ }

            try
            {
                ExpireOnDate = info.GetDateTime("ExpireOnDate");
            }
            catch (SerializationException) { /* Nullable Attribute */ }

            try
            {
                ParentEntryId = info.GetInt64("ParentEntryId");
            }
            catch (SerializationException) { /* Nullable Attribute */ }

            try
            {
                Elements = info.GetString("Elements");
            }
            catch (SerializationException) { /* Nullable Attribute */ }



            //Addresses
            if (_Addresses == null)
            {
                _Addresses = new EntitySet<Address>();
            }

            try
            {
                int addressCount = info.GetInt32("Address_Count");

                for (int i = 0; i < addressCount; i++)
                {
                    try
                    {
                        Address entity = (Address)info.GetValue(String.Format("Address_{0}", i), typeof(Address));
                        _Addresses.Add(entity);
                    }
                    catch (SerializationException) { /* Nullable Attribute */ }
                }

            }
            catch (SerializationException) { /* Nullable Attribute */ }

            //Geos
            if (_Geos == null)
            {
                _Geos = new EntitySet<Geo>();
            }

            try
            {
                int count = info.GetInt32("Geo_Count");

                for (int i = 0; i < count; i++)
                {
                    try
                    {
                        Geo entity = (Geo)info.GetValue(String.Format("Geo_{0}", i), typeof(Geo));
                        _Geos.Add(entity);
                    }
                    catch (SerializationException) { /* Nullable Attribute */ }
                }

            }
            catch (SerializationException) { /* Nullable Attribute */ }

            try
            {
                Content = (Content)info.GetValue("Content", typeof(Content));
            }
            catch (SerializationException) { /* Nullable Attribute */ }

            //Related
            if (_Related == null)
            {
                _Related = new EntitySet<Related>();
            }

            try
            {
                int count = info.GetInt32("Related_Count");

                for (int i = 0; i < count; i++)
                {
                    try
                    {
                        Related entity = (Related)info.GetValue(String.Format("Related_{0}", i), typeof(Related));
                        _Related.Add(entity);
                    }
                    catch (SerializationException) { /* Nullable Attribute */ }
                }

            }
            catch (SerializationException) { /* Nullable Attribute */ }

            //Periods
            if (_Times == null)
            {
                _Times = new EntitySet<Period>();
            }

            try
            {
                int count = info.GetInt32("Period_Count");

                for (int i = 0; i < count; i++)
                {
                    try
                    {
                        Period entity = (Period)info.GetValue(String.Format("Period_{0}", i), typeof(Period));
                        _Times.Add(entity);
                    }
                    catch (SerializationException) { /* Nullable Attribute */ }
                }

            }
            catch (SerializationException) { /* Nullable Attribute */ }

        }

        public virtual void GetObjectData(SerializationInfo info, StreamingContext context)
        {
            info.AddValue("EntryId", EntryId);
            info.AddValue("KindId", KindId);
            info.AddValue("AuditId", AuditId);
            info.AddValue("Title", Title);
            info.AddValue("DateUpdated", DateUpdated);
            info.AddValue("DateCreated", DateCreated);
            info.AddValue("UpdatedBy", UpdatedBy);

            if (RandomId.HasValue)
            {
                info.AddValue("RandomId", RandomId);
            }

            if (PublishedDate.HasValue)
            {
                info.AddValue("PublishedDate", PublishedDate);
            }

            info.AddValue("PublishedStatus", PublishedStatus);

            if (PublishedEntryId.HasValue)
            {
                info.AddValue("PublishedEntryId", PublishedEntryId);
            }

            if (PublishOnDate.HasValue)
            {
                info.AddValue("PublishOnDate", PublishOnDate);
            }

            if (ExpireOnDate.HasValue)
            {
                info.AddValue("ExpireOnDate", ExpireOnDate);
            }



            if (!String.IsNullOrEmpty(Elements))
            {
                info.AddValue("Elements", Elements);
            }


            // Entity Reference
            if (Addresses != null && Addresses.HasLoadedOrAssignedValues)
            {
                info.AddValue("Address_Count", Addresses.Count);
                for (int i = 0; i < Addresses.Count; i++)
                {
                    info.AddValue(String.Format("Address_{0}", i), Addresses[i]);
                }
            }

            //if (Geos != null && Geos.HasLoadedOrAssignedValues)
            //{
            //    info.AddValue("Geo_Count", Geos.Count);
            //    for (int i = 0; i < Geos.Count; i++)
            //    {
            //        info.AddValue(String.Format("Geo_{0}", i), Geos[i]);
            //    }
            //}

            //if (Content != null)
            //{
            //    info.AddValue("Content", Content);
            //}

            //if (Related != null && Related.HasLoadedOrAssignedValues)
            //{
            //    info.AddValue("Related_Count", Related.Count);
            //    for (int i = 0; i < Related.Count; i++)
            //    {
            //        info.AddValue(String.Format("Related_{0}", i), Related[i]);
            //    }
            //}

            //if (Periods != null && Periods.HasLoadedOrAssignedValues)
            //{
            //    info.AddValue("Period_Count", Periods.Count);
            //    for (int i = 0; i < Periods.Count; i++)
            //    {
            //        info.AddValue(String.Format("Period_{0}", i), Periods[i]);
            //    }
            //}
        }

        #endregion

        //
        // Comment: Insert and Update Methods for saving Entry to database
        //
        #region Insert/Update Methods

        /*
        /// <summary>
        /// Insert a new Entry to database.
        /// </summary>
        /// <param name="entry">An Entry to insert</param>
        public static void Insert(Entry entry)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                Entry.Insert(entry, db);
            }
        }

        /// <summary>
        /// Insert a new Entry to database.
        /// </summary>
        /// <param name="entry">An Entry to insert</param>
        /// <param name="db">A Web2DataContext</param>
        public static void Insert(Entry entry, Web2DataContext db)
        {
            entry.DateUpdated = DateTime.Now;
            db.Entries.InsertOnSubmit(entry);
            db.SubmitChanges();
        }

        /// <summary>
        /// Given Entry childQuery an EntryId, update Entry and all related tables.
        /// Given Entry without an EntryId, insert Entry and all related tables.
        /// </summary>
        /// <param name="entry">An Entry to insert or update</param>
        public static void DeepInsertOrUpdate(Entry entry)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                if (db.Entries.Count(e => e.EntryId == entry.EntryId) == 0)
                {
                    // If there is no entry with the entryId of specified entry, insert a new entry
                    Entry.Insert(entry, db);
                }
                else
                {
                    // Otherwise, (deep) update - update Entry and all related tables
                    DeepUpdate(entry, db);
                }
            }
        }

        /// <summary>
        /// Given Entries childQuery an EntryId, update Entrys and all related tables.
        /// Given Entries without an EntryId, insert Entrys and all related tables.
        /// </summary>
        /// <param name="entries">A collection of Entry to insert or update</param>
        public static void DeepInsertOrUpdate(IEnumerable<Entry> entries)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                IQueryable<Entry> oldEntries = db.Entries.Where(e => entries.Select(e2 => e2.EntryId).Contains(e.EntryId));
                foreach (Entry newEntry in entries)
                {
                    Entry oldEntry = oldEntries.Where(e => e.EntryId == newEntry.EntryId).FirstOrDefault();
                    if (oldEntry != null) //Update Entry
                    {
                        DeepUpdate(newEntry, db);
                    }
                    else //Insert New Entry and related elements
                    {
                        db.Entries.InsertOnSubmit(newEntry);
                        db.SubmitChanges();
                    }
                }
            }
        }

        /// <summary>
        /// Update an Entry and all related tables by using the specified DataContext
        /// </summary>
        /// <param name="entry">An Entry to update</param>
        /// <param name="context">A Web2DataContext</param>
        public static void DeepUpdate(Entry entry, Web2DataContext db)
        {
            Entry e = ConstructUpdatedEntry(entry, entry.EntryId, db);
            db.SubmitChanges();
        }

        /// <summary>
        /// Copy Entry and all related tables to other Entries specified by a given collection of entryId
        /// </summary>
        /// <param name="copyFromEntry">An original Entry to be copied</param>
        /// <param name="copyToEntryIds">A collection of entryId to copy to</param>
        public static void DeepCopy(Entry copyFromEntry, IEnumerable<long> copyToEntryIds)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                foreach (long copyToEntryId in copyToEntryIds)
                {
                    Entry e = ConstructUpdatedEntry(copyFromEntry, copyToEntryId, db);
                }
                db.SubmitChanges();
            }
        }

        /// <summary>
        /// (Depreciated) DO NOT USE THIS FUNCTION. Return an Entry to be updated with all updated properties set
        /// </summary>
        /// <param name="entryTemplate">An original Entry to be copied</param>
        /// <param name="updateToEntryId">An entryId of Entry to be updated</param>
        /// <param name="db">A Web2DataContext</param>
        /// <returns>An Entry to be updated</returns>
        private static Entry ConstructUpdatedEntry(Entry entryTemplate, long updateToEntryId, Web2DataContext db)
        {
            // Get old version of entry to update, copy the provided entry properties to it and save it
            Entry oldEntry = db.Entries.FirstOrDefault(e => e.EntryId == updateToEntryId);

            if (oldEntry == null)
            {
                return null;
            }

            //  - Required Entry's attributes
            oldEntry.Title = entryTemplate.Title;

            //  - Optional Entry's attributes
            if (entryTemplate.DateUpdated != DateTime.MinValue)
            {
                oldEntry.DateUpdated = entryTemplate.DateUpdated;
            }
            else
            {
                oldEntry.DateUpdated = DateTime.Now;
            }

            //  - All others columns go to Elements string
            oldEntry.Elements = MergeElements(oldEntry.Elements, entryTemplate.Elements);
            oldEntry.KindId = entryTemplate.KindId;

            //### Save other related tables ###
            //save content if the same entry
            if (entryTemplate.EntryId == updateToEntryId && entryTemplate.Content != null)
            {
                SaveContent(oldEntry, entryTemplate.Content, db);
            }
            //save address
            if (entryTemplate.Addresses != null && entryTemplate.Addresses.HasLoadedOrAssignedValues != false)
            {
                SaveAddresses(oldEntry, entryTemplate.Addresses, db);
            }
            //save links
            if (entryTemplate.Links != null && entryTemplate.Links.HasLoadedOrAssignedValues != false)
            {
                SaveLinks(oldEntry, entryTemplate.Links, db);
            }
            //save "from" relationships
            if (entryTemplate.FromRelationships.Count > 0)
            {
                SaveRelationships(oldEntry, entryTemplate.FromRelationships, db);
            }
            return oldEntry;
        }

        */
        #region Methods for Save/Insert related tables
        /*
        private static void SaveContent(Entry entry, Content content, Web2DataContext db)
        {
            var oldContent = entry.Content;
            if (oldContent == null) //Insert
            {
                db.Contents.InsertOnSubmit(content);
                entry.Content = content;
            }
            else //Update
            {
                oldContent.FullText = content.FullText;
                oldContent.ContentType = content.ContentType;
            }
        }

        private static void SaveAddresses(Entry entry, IEnumerable<Address> addresses, Web2DataContext db)
        {
            var removed = entry.Addresses.Where(a => !addresses.Select(a2 => a2.Text).Contains(a.Text));

            //Delete
            db.Addresses.DeleteAllOnSubmit(removed);
            entry.Addresses.RemoveRange(removed.ToEntitySet());

            //Insert or Update
            foreach (Address a in addresses)
            {
                var addr = entry.Addresses.FirstOrDefault(a1 => a1.AddressId == a.AddressId);
                if (addr == null) //Insert
                {
                    //entry.Addresses.Add(a);
                    db.Addresses.InsertOnSubmit(a);
                }
                else //Update
                {
                    addr.Text = a.Text;
                    addr.Kind = a.Kind;
                    addr.Primary = a.Primary;
                    addr.Rel = a.Rel;
                }
            }
        }

        private static void SaveLinks(Entry entry, IEnumerable<Link> links, Web2DataContext db)
        {
            var removed = entry.Links.Where(a => !links.Select(a2 => a2.href).Contains(a.href));

            //Delete
            db.Links.DeleteAllOnSubmit(removed);
            entry.Links.RemoveRange(removed.ToEntitySet());

            //Insert or Update
            foreach (Link a in links)
            {
                var link = entry.Links.FirstOrDefault(a1 => a1.LinkId == a.LinkId);
                if (link == null) //Insert
                {
                    //entry.Links.Add(a);
                    db.Links.InsertOnSubmit(a);
                }
                else //Update
                {
                    link.href = a.href;
                    link.rel = a.rel;
                    link.type = a.type;
                    link.hreflang = a.hreflang;
                    link.title = a.title;
                    link.length = a.length;
                    link.DateCreated = a.DateCreated;
                }
            }
        }

        private static void SaveRelationships(Entry entry, IEnumerable<Relationship> relationships, Web2DataContext db)
        {
            IEnumerable<Relationship> oldRels = entry.FromRelationships;
            foreach (Relationship rel in relationships)
            {
                var query = from r in oldRels
                            where r.RelId == rel.RelId && r.ToEntryId == rel.ToEntryId
                            select r;
                if (query.Count() == 0)
                {
                    Relationship newRel = new Relationship();
                    newRel.FromEntryId = entry.EntryId;
                    newRel.RelId = rel.RelId;
                    newRel.ToEntryId = rel.ToEntryId;
                    db.Relationships.InsertOnSubmit(newRel);
                }
            }
        }

        */
        #endregion

        #endregion

        //
        // Comment: Delete Methods for deleting Entry to database
        //
        #region Delete Method
        /*
        /// <summary>
        /// Delete an entry and its uncascaded records in relationship using a stored procedure
        /// </summary>
        /// <param name="entryId">An entryId to delete</param>
        public static void Delete(long entryId)
        {
            using (Web2DataContext dc = new Web2DataContext())
            {
                Delete(entryId, dc);
            }
        }

        /// <summary>
        /// Delete an entry and its uncascaded records in relationship using a stored procedure
        /// </summary>
        /// <param name="entryId">An entryId to delete</param>
        /// <param name="dc">A Web2DataContext</param>
        public static void Delete(long entryId, Web2DataContext dc)
        {
            dc.Entry_Delete(entryId);
            dc.SubmitChanges();
        }

        /// <summary>
        /// Delete entries and their uncascaded records in relationship
        /// </summary>
        /// <param name="entries">A collection of Entry to delete</param>
        public static void Delete(IEnumerable<Entry> entries)
        {
            using (Web2DataContext dc = new Web2DataContext())
            {
                foreach (Entry entry in entries)
                {
                    Delete(entry.EntryId, dc);
                }
                dc.SubmitChanges();
            }
        }
        */
        #endregion

		public double SimilarityValue(Entry other)
		{
			double score = this.KindId == other.KindId ? 1 : 0;
			score += this.XElements.Elements()
				.Count(a => other.XElements.Elements()
					.Any(o =>
						o.Name == a.Name)); 
			score += this.XElements.Elements()
				 .Count(a => other.XElements.Elements()
					 .Any(o =>
						 o.Name == a.Name
						 && o.Value == a.Value));
			score += this.Related
				.Count(a => other.Related.Any(o => o.RelId == a.RelId 
					&& o.EntryId == a.EntryId 
					&& a.IsFromThisEntry == o.IsFromThisEntry));
			score += this.Related
				.Count(a => other.Related
								.Any(o => o.RelId == a.RelId 
									&& o.EntryId == a.EntryId 
									&& a.IsFromThisEntry == o.IsFromThisEntry 
									&& a.DoubleValue == o.DoubleValue 
									&& a.TextValue == o.TextValue 
									&& a.BoolValue == o.BoolValue 
									&& a.DateValue == o.DateValue 
									&& a.XmlValue == o.XmlValue));
			return score;
		}

		/// <summary>
		/// 
		/// </summary>
		public RelatedValues RelatedValues;

		public RelatedValues GetRelatedValues(long relId, long relatedEntryId)
		{
			Related rel = this.Related.Where(r => r.RelId == relId && r.EntryId == relatedEntryId && (r.IsFromThisEntry || r.IsBidirectional)).FirstOrDefault();
			if (rel == null)
				return new RelatedValues(false, relatedEntryId, relId, false, null, null, null, null, null, null);
			else
				return new RelatedValues(true, relatedEntryId, relId, rel.IsFromThisEntry, rel.TextValue, rel.DoubleValue, rel.DateValue, rel.BoolValue, rel.IntValue, rel.XmlValue);
		}

		private long? _Index;
		public long? Index
		{
			get
			{
				if (_Index == null)
				{
					if (XElementValue("Index") == null)
						return null;
					else
						_Index = long.Parse(XElementValue("Index"));
				}
				return _Index;
			}
		}

		private EntryMedia _LogoImage;
		public EntryMedia LogoImage
		{
			get
			{
				if (_LogoImage == null)
				{
					if (this.EntryMedias.Any(em => em.MediaTypeId == (int)MediaContentType.Image && Helper.MediaHelper.IsPrimary(em.MediaCategoryId)))
						_LogoImage = this.EntryMedias.Where(em => em.MediaTypeId == (int)MediaContentType.Image && Helper.MediaHelper.IsLogo(em.MediaCategoryId))
											.FirstOrDefault();
					else
					{
						if (Kind != null)
							_LogoImage = this.Kind.EntryMedias.Where(em => em.MediaTypeId == (int)MediaContentType.Image && Helper.MediaHelper.IsLogo(em.MediaCategoryId))
											.FirstOrDefault();
					}
				}
				return _LogoImage;
			}
		}
		public string LogoImageUrl
		{
			get
			{
				return LogoImage == null ? null : Helper.MediaHelper.GetMediaUrl(LogoImage.MediaId);
			}
		}
		public string LogoImageThumbnailUrl(int? width = null, int? height = null, bool clip = true)
		{
			return LogoImage == null
				? null
				: Helper.MediaHelper.GetMediaThumbnailUrl(LogoImage.MediaId,
					string.Format("{0}{1}{2}",
						"?clip=" + clip,
						width == null ? "" : "&width=" + width,
						height == null ? "" : "&height=" + height)
					);
		}
		public string LogoImageThumbnailUrl_16
		{
			get
			{
				return LogoImageThumbnailUrl(16, 16);
			}
		}
		public string LogoImageThumbnailUrl_50
		{
			get
			{
				return LogoImageThumbnailUrl(50, 50);
			}
		}
		public string LogoImageThumbnailUrl_100
		{
			get
			{
				return LogoImageThumbnailUrl(100, 100);
			}
		}
		public string LogoImageThumbnailUrl_32
		{
			get
			{
				return LogoImageThumbnailUrl(32, 32);
			}
		}  

		private EntryMedia _DefaultImage;
		public EntryMedia DefaultImage
		{
			get
			{
				if (_DefaultImage == null)
				{
					if (this.EntryMedias.Any(em => em.MediaTypeId == (int)MediaContentType.Image && Helper.MediaHelper.IsPrimary(em.MediaCategoryId)))
						_DefaultImage = this.EntryMedias.Where(em => em.MediaTypeId == (int)MediaContentType.Image && Helper.MediaHelper.IsPrimary(em.MediaCategoryId))
											.FirstOrDefault();
				}
				return _DefaultImage;
			}
		}
		public string DefaultImageUrl
		{
			get
			{
				return DefaultImage == null ? null : Helper.MediaHelper.GetMediaUrl(DefaultImage.MediaId);
			}
		}
		public string DefaultImageThumbnailUrl(int? width = null, int? height = null, bool clip = true)
		{
			return DefaultImage == null
				? null
				: Helper.MediaHelper.GetMediaThumbnailUrl(DefaultImage.MediaId,
					string.Format("{0}{1}{2}",
						"?clip=" + clip,
						width == null ? "" : "&width=" + width,
						height == null ? "" : "&height=" + height)
					);
		}
		public string DefaultImageThumbnailUrl_16
		{
			get
			{
				return DefaultImageThumbnailUrl(16, 16);
			}
		}
		public string DefaultImageThumbnailUrl_50
		{
			get
			{
				return DefaultImageThumbnailUrl(50, 50);
			}
		}
		public string DefaultImageThumbnailUrl_100
		{
			get
			{
				return DefaultImageThumbnailUrl(100, 100);
			}
		}
		public string DefaultImageThumbnailUrl_32
		{
			get
			{
				return DefaultImageThumbnailUrl(32, 32);
			}
		}


		private Dictionary<string, string> _Attributes;
		public Dictionary<string, string> Attributes
		{
			get
			{
				if (_Attributes == null)
				{
					_Attributes = new Dictionary<string, string>();
					foreach (XElement xelement in this.XElements.Elements().Where(x => x.Name != "PostSchema"))
					{
						_Attributes.Add(xelement.Name.ToString(), xelement.Value);
					}
					foreach (long relId in this.Related.Where(r => r.ThisEntryId == this.EntryId && (r.IsFromThisEntry || r.IsBidirectional)).Select(r => r.RelId).Distinct())
					{
						_Attributes.Add(this.Related.First(r => r.RelId == relId).InRole,
							string.Join(", ", 
								this.Related.Where(r => r.RelId == relId && r.ThisEntryId == this.EntryId && (r.IsFromThisEntry || r.IsBidirectional))
								.Select(r => r.Title)));
					}
				}
				return _Attributes;
			}
		}


		/// <summary>
        /// Returns a friendly url to the overview profile page of the specified entry.
        /// </summary>
        public string OverviewUrl
        {
            get
            {
                return GetOverviewUrl(this);//GetOverviewUrl(EntryId, Title);
            }
        }


        public static string GetOverviewUrl(Entry e)
        {
            string overviewUrl = e.XElementValue("OverviewUrl");
            if (!string.IsNullOrEmpty(overviewUrl))
            {
                return overviewUrl;
            }
            else
                return VirtualPathUtility.ToAbsolute(string.Format("~/overview/{0}/{1}"
                    , HttpContext.Current.Server.UrlEncode(Regex.Replace(e.Title.Replace(" ", "-").Replace("&", "and").Replace("?", ""), "[:,/\"\'.*%]", "-")), e.EntryId));
        }
        /// <summary>
        /// Deletes entries related to contact entry and username entry.
        /// </summary>
        /// <param name="userName"></param>
        public static void DeleteContactEntry(string userName)
        {
            using (Web2DataContext db = new Web2DataContext())
            {
                Entry contact = db.Entries.DynamicWhere(db, "KindId=@0 and UserName=@1", (long)BuiltInKind.Contact, userName).FirstOrDefault();
                if (contact != null)
                {
                    db.Entries.DeleteOnSubmit(contact);
                    db.SubmitChanges();
                }
            }
        }


        //
        // Comment: Elements Methods for merging two Elements
        //
        #region Merge Elements Methods

        /// <summary>
        /// Set old Elements values to be new ones. Add new columns.
        /// </summary>
        /// <param name="oldElements">Old XElement</param>
        /// <param name="newElements">New XElement to be merge</param>
        /// <returns>Merged Elements</returns>
        public static string MergeElements(string oldElements, string newElements)
        {
            //Set old columns' value to be the new one. Add new columns.
            if (string.IsNullOrEmpty(oldElements))
            {
                return newElements;
            }
            else if (string.IsNullOrEmpty(newElements))
            {
                return oldElements;
            }

            XElement oldXEle = XElement.Parse("<Elements>" + oldElements + "</Elements>");
            XElement newXEle = XElement.Parse("<Elements>" + newElements + "</Elements>");

            return MergeXElements(oldXEle, newXEle).ToString(SaveOptions.DisableFormatting)
                .Replace("<Elements>", "").Replace("</Elements>", "");
        }

        /// <summary>
        /// Merges the Elements from this entry with the Entry in the param
        /// </summary>
        /// <param name="e">Entry elements to merge with the current entry</param>
        public void MergeElements(Entry e)
        {
            this.Elements = Entry.MergeElements(this.Elements, e.Elements);
        }

        /// <summary>
        /// Set old XElements values to be new ones. Add new columns.
        /// </summary>
        /// <param name="oldXEle">Old XElements</param>
        /// <param name="newXEle">New XElements to be merge</param>
        /// <returns>Merged XElements</returns>
        public static XElement MergeXElements(XElement oldXEles, XElement newXEles)
        {
            foreach (XElement newNode in newXEles.Elements())
            {
                XElement oldNode = oldXEles.Elements(newNode.Name.LocalName).FirstOrDefault();
                if (oldNode != null)
                {
                    oldNode.Value = newNode.Value;
                }
                else
                {
                    oldXEles.Add(newNode);
                }
            }
            foreach (XElement oldNode in oldXEles.Elements())
            {
                if (newXEles.Elements(oldNode.Name.LocalName).FirstOrDefault() == null)
                {
                    oldXEles.Elements(oldNode.Name.LocalName).Remove();
                }

            }

            return oldXEles;
        }

        #endregion

        public XElement ToSearchIndexXML()
        {
            XElement xe = new XElement(this.GetType().Name);
            xe.Add(new XElement("Title", this.Title));

            List<string> columns = new List<string>();
            columns.Add("Summary");
            columns.Add("Keywords");

            List<XElement> cxe = this.XElements.Elements().Where(ex => columns.Contains(ex.Name.LocalName)).ToList();
            xe.Add(cxe);

            return xe;
        }

        public Entry Save(CRG.Web2.Web2DataContext dc)
        {
            const int expandYears = 3;
            Entry e = this;
            if (e.EntryId == 0)
            {
                if (!string.IsNullOrEmpty(e.SchedulePattern))
                {
                    e.Periods.AddRange(e.Schedule.CalculatePeriods(DateTime.Now.AddYears(expandYears)));
                }
                dc.Entries.InsertOnSubmit(e);
            }
            else // update delete
            {
                dc.Entries.Attach(e);
                dc.Refresh(RefreshMode.KeepCurrentValues, e);
                Refresh(dc, e.Addresses);
                Refresh(dc, e._Content);
                Refresh(dc, e.Geos);
                Refresh(dc, e.Links);
                Refresh(dc, e.EntryMedias);
                // relationshiop only insert/delete 
                if (e.FromRelationships != null && e.FromRelationships.HasLoadedOrAssignedValues)
                {
                    dc.Relationships.InsertAllOnSubmit(e.FromRelationships.Where(r => !r.Delete));
                    var relDels = e.FromRelationships.Where(r => r.Delete);
                    if (e.EntryId > 0 && relDels.Any())
                    {
                        List<long> relIds = e.FromRelationships.Select(r => r.RelId).ToList();
                        List<Relationship> rels = Relationship.GetRelationships(dc, e.EntryId, relIds).ToList();
                        dc.Relationships.DeleteAllOnSubmit(rels.Where(r => relDels.Any(rd => rd.FromEntryId == r.FromEntryId && rd.ToEntryId == r.ToEntryId)));
                    }
                }
                if (!string.IsNullOrEmpty(e.SchedulePattern))
                {
                    dc.Periods.DeleteAllOnSubmit(dc.Periods.Where(p => p.EntryId == e.EntryId));
                    e.Periods.AddRange(e.Schedule.CalculatePeriods(DateTime.Now.AddYears(expandYears)));
                }
            }

            dc.SubmitChanges();
            return e;
        }

        public void UpdatePeriods(Web2DataContext dc, Entry entry, int expandYears = 3)
        {
            // delete all, and insert all
            dc.Periods.Where(p => p.EntryId == entry.EntryId);

            DateTime time = DateTime.Now.AddYears(expandYears);
            dc.Periods.InsertAllOnSubmit(entry.Schedule.CalculatePeriods(time));
        }
        private void Refresh<T>(Web2DataContext dc, EntitySet<T> entitySet) where T : class, IDelete, IAudit
        {
            if (entitySet != null && entitySet.HasLoadedOrAssignedValues)
            {
                // insert
                dc.GetTable<T>().InsertAllOnSubmit(entitySet.Where(e => e.EntityId == 0 && !e.Delete));
                // update
                dc.Refresh(RefreshMode.KeepCurrentValues, entitySet.Where(e => e.EntityId > 0 && !e.Delete));

                var dkeys = entitySet.Where(e => e.Delete && e.EntityId > 0).Select(d => d.AuditId).ToList();
                // delete
                if (dkeys.Any())
                {
                    dc.GetTable<T>().DeleteAllOnSubmit(dc.GetTable<T>().Where(e => dkeys.Contains(e.AuditId)));
                }
                //foreach (T entity in entitySet.Where(e=>e.Delete).ToList())
                //{
                //    entitySet.Remove(entity);
                //}
            }
        }
        private void Refresh<T>(Web2DataContext dc, EntityRef<T> entityRef) where T : class, IDelete, IAudit
        {
            if (entityRef.Entity != null && entityRef.HasLoadedOrAssignedValue && entityRef.Entity.EntityId > 0)
            {
                if (entityRef.Entity.Delete)
                {
                    var dkeys = new Guid[] { entityRef.Entity.AuditId };
                    dc.GetTable<T>().DeleteAllOnSubmit(dc.GetTable<T>().Where(e => dkeys.Contains(e.AuditId)));
                    entityRef.Entity = null;
                }
                else if (entityRef.Entity.DateCreated != DateTime.MinValue)
                {
                    dc.Refresh(RefreshMode.KeepCurrentValues, entityRef.Entity);
                }
                else
                {
                    dc.GetTable<T>().InsertOnSubmit(entityRef.Entity);
                }
            }
        }
    }

    public class EntryComparer : IEqualityComparer<Entry>
    {
        public bool Equals(Entry x, Entry y)
        {
            return (x.EntryId == y.EntryId);// && x.AddMode == y.AddMode);
        }

        public int GetHashCode(Entry en)
        {
            return en.ToString().ToLower().GetHashCode();
        }
    }
}

