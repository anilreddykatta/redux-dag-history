import * as React from 'react';
const { DropTarget } = require('react-dnd');
import Bookmark from '../Bookmark';
import './BookmarkList.scss';

const { PropTypes } = React;

const log = require('debug')('@essex/redux-dag-history:BookmarkList');

export interface IBookmarkListProps {
  bookmarks: any[];
  onBookmarkClick?: Function;
  onSelectState?: Function;
  onSelectBookmarkDepth?: Function;
  bookmarkEditIndex: number;
  onBookmarkEdit: Function;
  onBookmarkEditDone: Function;

  dragIndex?: number;
  hoverIndex?: number;
  dragKey?: string;
}

export default class BookmarkList extends React.PureComponent<IBookmarkListProps, {}> {
  public static propTypes = {
    onBookmarkClick: PropTypes.func,
    onBookmarkMove: PropTypes.func,
    onSelectState: PropTypes.func,
    bookmarks: PropTypes.arrayOf(
      React.PropTypes.shape(Bookmark.propTypes)
    ).isRequired,
  };

  onBookmarkClick(index, stateId) {
    if (this.props.onBookmarkClick) {
      this.props.onBookmarkClick(index, stateId);
    }
  }

  render() {
    const {
      bookmarks,
      onBookmarkClick,
      onSelectState,
      onSelectBookmarkDepth,
      dragIndex,
      hoverIndex,
      dragKey,
      onBookmarkEdit,
      onBookmarkEditDone,
      bookmarkEditIndex,
    } = this.props;

    let bookmarkViews = bookmarks.map((s, index) => (
      <Bookmark
        {...s}
        editMode={index === bookmarkEditIndex}
        hoverIndex={hoverIndex}
        dragIndex={dragIndex}
        dragKey={dragKey}
        key={`bookmark::${s.stateId}`}
        index={index}
        onBookmarkEdit={onBookmarkEdit}
        onBookmarkEditDone={onBookmarkEditDone}
        stateId={s.stateId}
        onSelectBookmarkDepth={onSelectBookmarkDepth}
        onClick={() => this.onBookmarkClick(index, s.stateId)}
        onDiscoveryTrailIndexClicked={selectedIndex => {
          const target = s.shortestCommitPath[selectedIndex];
          onSelectBookmarkDepth({ target, depth: selectedIndex, state: target });
          onSelectState(target);
        }}
      />
    ));

    if (dragKey && hoverIndex >= 0 && hoverIndex !== dragIndex) {
      const dragged = bookmarkViews[dragIndex];
      const adjustedHoverIndex = hoverIndex < dragIndex ? hoverIndex : hoverIndex - 1;
      bookmarkViews.splice(dragIndex, 1);
      bookmarkViews.splice(adjustedHoverIndex, 0, dragged);
    }
    return (
      <div className="state-list-container">
        <div className="bookmark-list">
          {bookmarkViews}
        </div>
      </div>
    );
  }
}
