import React from 'react'
import Avatar from "react-avatar"
const Client = ({username}) => {
  return (
    <div>
        <Avatar name={username} size={50} round="15px"/>
        <span className='flex flex-col font-bold justify-center gap-10'>{username}</span> 
    </div>
  )
}

export default Client
