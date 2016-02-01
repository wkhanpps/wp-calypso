/**
 * External dependencies
 */
import React, { PropTypes } from 'react';
import includes from 'lodash/collection/includes';

/**
 * Internal dependencies
 */
import CompactCard from 'components/card/compact';
import EmptyContent from 'components/empty-content';
import GhostImporter from 'my-sites/importer/importer-ghost';
import ImporterStore, { getState as getImporterState } from 'lib/importer/store';
import Interval, { EVERY_FIVE_SECONDS } from 'lib/interval';
import MediumImporter from 'my-sites/importer/importer-medium';
import SquarespaceImporter from 'my-sites/importer/importer-squarespace';
import WordPressImporter from 'my-sites/importer/importer-wordpress';
import { fetchState } from 'lib/importer/actions';
import { appStates, importerTypes } from 'lib/importer/constants';

export default React.createClass( {
	displayName: 'SiteSettingsImport',

	propTypes: {
		site: PropTypes.shape( {
			slug: PropTypes.string.isRequired,
			title: PropTypes.string.isRequired
		} )
	},

	componentDidMount: function() {
		ImporterStore.on( 'change', this.updateState );
	},

	componentWillUnmount: function() {
		ImporterStore.off( 'change', this.updateState );
	},

	getDescription: function() {
		return this.translate(
			'Import another site\'s content into ' +
			'{{strong}}%(title)s{{/strong}}. Once you start an ' +
			'import, come back here to check on the progress. ' +
			'Check out our {{a}}import guide{{/a}} ' +
			'if you need more help.', {
				args: { title: this.getSiteTitle() },
				components: {
					a: <a href="https://support.wordpress.com/import/" />,
					strong: <strong />
				}
			}
		);
	},

	getInitialState: function() {
		return getImporterState();
	},

	getSiteTitle: function() {
		return this.props.site.title.length ? this.props.site.title : this.props.site.slug;
	},

	/**
	 * Finds the import status objects for a
	 * particular type of importer
	 *
	 * @param {enum} type ImportConstants.IMPORT_TYPE_*
	 * @returns {Array<Object>} ImportStatus objects
	 */
	getStatusFor: function( type ) {
		const { api: { isHydrated }, importers } = this.state;
		const { site } = this.props;
		var disabledTypes, status;

		disabledTypes = [
			importerTypes.GHOST,
			importerTypes.MEDIUM,
			importerTypes.SQUARESPACE
		];

		if ( ! isHydrated || includes( disabledTypes, type ) ) {
			return [ { importerState: appStates.DISABLED, type } ];
		}

		status = Object.keys( importers )
			.map( id => importers[ id ] )
			.filter( importer => site.ID === importer.site.ID )
			.filter( importer => type === importer.type );

		if ( 0 === status.length ) {
			return [ { importerState: appStates.INACTIVE, type } ];
		}

		return status.map( item => Object.assign( {}, item, { site } ) );
	},

	renderImporters: function() {
		var siteTitle = this.getSiteTitle();

		return Object.keys( importerTypes ).map( type => (
			this.getStatusFor( importerTypes[ type ] ).map( ( status, index ) => {
				const key = `import-list-${type}-${index}`;

				status.siteTitle = siteTitle;

				switch ( importerTypes[ type ] ) {
					case importerTypes.GHOST:
						return <GhostImporter key={ key } importerStatus={ status } />;

					case importerTypes.MEDIUM:
						return <MediumImporter key={ key } importerStatus={ status } />;

					case importerTypes.SQUARESPACE:
						return <SquarespaceImporter key={ key } importerStatus={ status } />;

					case importerTypes.WORDPRESS:
						return <WordPressImporter key={ key } importerStatus={ status } site={ this.props.site } />;
				}
			} )
		) );
	},

	updateFromAPI: function() {
		fetchState( this.props.site.ID );
	},

	updateState: function() {
		this.setState( getImporterState() );
	},

	render: function() {
		if ( this.props.site.jetpack ) {
			return (
				<EmptyContent
					illustration="/calypso/images/drake/drake-jetpack.svg"
					title={ this.translate( 'Want to import into your site?' ) }
					line={ this.translate( `Visit your site's wp-admin for all your import and export needs.` ) }
					action={ this.translate( 'Import into %(siteTitle)s', { args: { siteTitle: this.props.site.title } } ) }
					actionURL={ this.props.site.options.admin_url + 'import.php' }
					actionTarget="_blank"
				/>
			);
		}

		return (
			<div className="section-import">
				<Interval onTick={ this.updateFromAPI } period={ EVERY_FIVE_SECONDS } />
				<CompactCard>
					<header>
						<h1 className="importer__section-title">{ this.translate( 'Import Another Site' ) }</h1>
						<p className="importer__section-description">{ this.getDescription() }</p>
					</header>
				</CompactCard>
				{ this.renderImporters() }
			</div>
		);
	}
} );
