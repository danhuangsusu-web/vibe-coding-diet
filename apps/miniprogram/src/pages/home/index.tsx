import { Button, Text, View } from '@tarojs/components'

import './index.scss'

export default function HomePage() {
  return (
    <View className='page'>
      <Text className='eyebrow'>作品集 MVP</Text>
      <Text className='title'>今天这顿饭，怎么吃更合适？</Text>
      <Text className='description'>上传一张餐食图片或输入菜名，获得热量区间、红黄绿灯和行动建议。</Text>
      <View className='actions'>
        <Button className='primary'>上传餐食图片</Button>
        <Button className='secondary'>文字输入</Button>
      </View>
    </View>
  )
}
