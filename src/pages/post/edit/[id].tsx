import { withUrqlClient } from 'next-urql';
import { createUrqlClient } from '../../../utils/createUrqlClient';


const EditPost = ({}) => {
    return <div>Hello Edit</div>
}

export default withUrqlClient(createUrqlClient)(EditPost);